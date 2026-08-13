import { Hono, type Context, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { AppError } from "../application/errors";
import { EvaluateWritingService } from "../application/services/evaluate-writing";
import { countWords, createWritingRequestSchema } from "../domain/writing/validation";
import type { AuthenticatedUser } from "../domain/users/user";
import { authCookieOptions } from "../infrastructure/auth/cookie-options";
import { GoogleOAuthClient } from "../infrastructure/auth/google/google-oauth";
import { randomToken, sha256, signValue, verifySignedValue } from "../infrastructure/auth/crypto";
import { readConfig } from "../infrastructure/config";
import { NeonRepositories } from "../infrastructure/db/neon/neon-repositories";
import { CloudflareWorkersAIProvider } from "../infrastructure/llm/cloudflare-workers-ai/provider";
import type { RuntimeEnv } from "../infrastructure/runtime/cloudflare/bindings";

type AppVariables = {
  user: AuthenticatedUser;
  httpRequestId: string;
  requestStartedAt: number;
};
type AppContext = Context<{ Bindings: RuntimeEnv; Variables: AppVariables }>;
const SESSION_COOKIE = "me2write_session";
const OAUTH_STATE_COOKIE = "me2write_oauth_state";
const OAUTH_VERIFIER_COOKIE = "me2write_oauth_verifier";

const errorProperty = (value: unknown, property: string): string | number | undefined => {
  if (typeof value !== "object" || value === null || !(property in value)) return undefined;
  const candidate = value[property as keyof typeof value];
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : undefined;
};

const requestFields = (values: {
  httpRequestId: string;
  cfRay: string | null;
  method: string;
  path: string;
  requestStartedAt: number;
}) => ({
  httpRequestId: values.httpRequestId,
  cfRay: values.cfRay,
  method: values.method,
  path: values.path,
  latencyMs: Date.now() - values.requestStartedAt
});

const errorPayload = (requestId: string, code: string, message: string) => ({
  error: { code, message, requestId }
});

const repositories = (context: AppContext) => new NeonRepositories(readConfig(context.env).databaseUrl);

const requireAuth: MiddlewareHandler<{ Bindings: RuntimeEnv; Variables: AppVariables }> = async (context, next) => {
  const token = getCookie(context, SESSION_COOKIE);
  if (!token) throw new AppError("AUTH_REQUIRED", "Sign in to check your writing.", 401);
  const user = await repositories(context).findUserByTokenHash(await sha256(token));
  if (!user) throw new AppError("AUTH_REQUIRED", "Your session has expired. Please sign in again.", 401);
  context.set("user", user);
  await next();
};

const requireAdmin: MiddlewareHandler<{ Bindings: RuntimeEnv; Variables: AppVariables }> = async (context, next) => {
  const user = context.get("user");
  const email = user.email?.toLowerCase();
  if (!email || !readConfig(context.env).adminEmails.has(email)) {
    throw new AppError("FORBIDDEN", "Administrator access is required.", 403);
  }
  await next();
};

const requireActiveUser: MiddlewareHandler<{ Bindings: RuntimeEnv; Variables: AppVariables }> = async (context, next) => {
  const user = context.get("user");
  const temporarilyBlocked = Boolean(user.blockedUntil && new Date(user.blockedUntil).getTime() > Date.now());
  if (user.permanentlyBlocked || temporarilyBlocked) {
    throw new AppError(
      "USER_BLOCKED",
      user.permanentlyBlocked ? "This account has been blocked from using evaluations." : `This account is suspended until ${user.blockedUntil}.`,
      403
    );
  }
  await next();
};

const evaluationResponse = (record: { id: string; status: string; result: unknown }) => ({
  id: record.id,
  status: record.status,
  evaluation: record.result
});

export const createApp = () => {
  const app = new Hono<{ Bindings: RuntimeEnv; Variables: AppVariables }>();

  app.use("*", async (context, next) => {
    context.set("httpRequestId", crypto.randomUUID());
    context.set("requestStartedAt", Date.now());
    context.header("X-Request-Id", context.get("httpRequestId"));
    await next();
    console.log(
      JSON.stringify({
        event: "request_completed",
        ...requestFields({
          httpRequestId: context.get("httpRequestId"),
          cfRay: context.req.header("cf-ray") ?? null,
          method: context.req.method,
          path: context.req.path,
          requestStartedAt: context.get("requestStartedAt")
        }),
        status: context.res.status,
        outcome: context.res.status >= 400 ? "error" : "success"
      })
    );
  });
  app.use("*", secureHeaders());
  app.use("*", async (context, next) => {
    const isBrowserApiRoute = context.req.path.startsWith("/api/") || context.req.path === "/auth/logout";
    if (!isBrowserApiRoute) {
      await next();
      return;
    }
    const origin = context.req.header("origin");
    // Handle CORS before parsing the full application config. This ensures
    // browser preflight requests still receive the proper headers when an
    // unrelated runtime secret is missing or invalid.
    const configuredAppOrigin = typeof context.env.APP_ORIGIN === "string" ? context.env.APP_ORIGIN.replace(/\/$/u, "") : "";
    const originAllowed = Boolean(origin && origin === configuredAppOrigin);
    if (originAllowed) {
      context.header("Access-Control-Allow-Origin", origin);
      context.header("Access-Control-Allow-Credentials", "true");
      context.header("Access-Control-Expose-Headers", "X-Request-Id");
      context.header("Vary", "Origin");
    }
    if (context.req.method === "OPTIONS") {
      context.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      context.header("Access-Control-Allow-Headers", "Content-Type");
      if (!originAllowed) return context.body(null, 403);
      return context.body(null, 204);
    }
    const config = readConfig(context.env);
    if (context.req.method === "POST" && origin !== config.appOrigin) {
      throw new AppError("FORBIDDEN", "Request origin is not allowed.", 403);
    }
    await next();
  });
  app.use("/api/evaluations", bodyLimit({ maxSize: 24 * 1024, onError: (context) => context.json(errorPayload(context.get("httpRequestId") as string, "INVALID_INPUT", "Request body is too large."), 413) }));

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/api/config", (context) => context.json({ maximumWritingWords: readConfig(context.env).maximumWritingWords }));

  app.get("/auth/google", async (context) => {
    const config = readConfig(context.env);
    const verifier = randomToken(48);
    const state = await signValue(JSON.stringify({ nonce: randomToken(), expiresAt: Date.now() + 10 * 60_000 }), config.sessionSecret);
    const challenge = await sha256(verifier);
    setCookie(context, OAUTH_STATE_COOKIE, state, authCookieOptions(config, 600));
    setCookie(context, OAUTH_VERIFIER_COOKIE, verifier, authCookieOptions(config, 600));
    const google = new GoogleOAuthClient(config.googleClientId, config.googleClientSecret, `${config.apiOrigin}/auth/google/callback`);
    return context.redirect(google.authorizationUrl(state, challenge));
  });

  app.get("/auth/google/callback", async (context) => {
    const config = readConfig(context.env);
    const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(context.req.query());
    const stateCookie = getCookie(context, OAUTH_STATE_COOKIE);
    const verifier = getCookie(context, OAUTH_VERIFIER_COOKIE);
    deleteCookie(context, OAUTH_STATE_COOKIE, { path: "/" });
    deleteCookie(context, OAUTH_VERIFIER_COOKIE, { path: "/" });
    if (!query.success || !stateCookie || !verifier || query.data.state !== stateCookie) {
      throw new AppError("AUTH_REQUIRED", "Invalid or expired sign-in request.", 401);
    }
    const decoded = await verifySignedValue(query.data.state, config.sessionSecret);
    let statePayload: unknown = null;
    try {
      statePayload = decoded ? JSON.parse(decoded) : null;
    } catch {
      statePayload = null;
    }
    const stateData = z.object({ nonce: z.string(), expiresAt: z.number() }).safeParse(statePayload);
    if (!stateData?.success || stateData.data.expiresAt < Date.now()) {
      throw new AppError("AUTH_REQUIRED", "Invalid or expired sign-in request.", 401);
    }
    const google = new GoogleOAuthClient(config.googleClientId, config.googleClientSecret, `${config.apiOrigin}/auth/google/callback`);
    const identity = await google.exchange(query.data.code, verifier);
    const db = repositories(context);
    const user = await db.upsertExternalIdentity(identity);
    const sessionToken = randomToken(48);
    const sessionSeconds = 60 * 60 * 24 * 30;
    await db.create(user.id, await sha256(sessionToken), new Date(Date.now() + sessionSeconds * 1000));
    setCookie(context, SESSION_COOKIE, sessionToken, authCookieOptions(config, sessionSeconds));
    return context.redirect(config.appOrigin);
  });

  app.post("/auth/logout", async (context) => {
    const token = getCookie(context, SESSION_COOKIE);
    if (token) await repositories(context).deleteByTokenHash(await sha256(token));
    deleteCookie(context, SESSION_COOKIE, { path: "/" });
    return context.json({ ok: true });
  });

  app.get("/api/me", requireAuth, (context) => {
    const user = context.get("user");
    return context.json({ user: {
      ...user,
      isBlocked: user.permanentlyBlocked || Boolean(user.blockedUntil && new Date(user.blockedUntil).getTime() > Date.now()),
      isAdmin: Boolean(user.email && readConfig(context.env).adminEmails.has(user.email.toLowerCase()))
    } });
  });

  app.post("/api/evaluations", requireAuth, requireActiveUser, async (context) => {
    const startedAt = Date.now();
    const config = readConfig(context.env);
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      throw new AppError("INVALID_INPUT", "Request body must be valid JSON.", 400);
    }
    const parsed = createWritingRequestSchema(config.maximumWritingWords).safeParse(body);
    if (!parsed.success) {
      const tooLong = typeof body === "object" && body !== null && "text" in body && typeof body.text === "string" && countWords(body.text) > config.maximumWritingWords;
      throw new AppError(tooLong ? "WRITING_TOO_LONG" : "INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid writing request.", 400);
    }
    const db = repositories(context);
    const service = new EvaluateWritingService(
      db,
      new CloudflareWorkersAIProvider(config.aiAccountId, config.aiApiToken, config.llmModel),
      config.maximumLlmTokens,
      config.maximumDailyEvaluations
    );
    const user = context.get("user");
    try {
      const result = await service.execute({
        requestId: parsed.data.requestId,
        userId: user.id,
        text: parsed.data.text,
        wordCount: countWords(parsed.data.text),
        mode: parsed.data.mode,
        targetLevel: parsed.data.targetLevel ?? null,
        feedbackLanguage: parsed.data.feedbackLanguage
      });
      console.log(JSON.stringify({ event: "evaluation_completed", httpRequestId: context.get("httpRequestId"), evaluationRequestId: parsed.data.requestId, evaluationId: result.id, userId: user.id, provider: config.llmProvider, model: config.llmModel, latencyMs: Date.now() - startedAt }));
      return context.json(evaluationResponse(result), result.status === "completed" ? 200 : 202);
    } catch (error) {
      console.error(JSON.stringify({ event: "evaluation_failed", httpRequestId: context.get("httpRequestId"), evaluationRequestId: parsed.data.requestId, userId: user.id, provider: config.llmProvider, model: config.llmModel, latencyMs: Date.now() - startedAt, errorType: error instanceof AppError ? error.code : "INTERNAL_ERROR" }));
      throw error;
    }
  });

  app.get("/api/evaluations/:id", requireAuth, async (context) => {
    const record = await repositories(context).findById(context.req.param("id"), context.get("user").id);
    if (!record) throw new AppError("NOT_FOUND", "Evaluation not found.", 404);
    return context.json(evaluationResponse(record));
  });

  app.get("/api/admin/llm-usage", requireAuth, requireAdmin, async (context) => {
    const config = readConfig(context.env);
    return context.json(await repositories(context).usageDashboard(config.adminTimeZone));
  });

  app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (context) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
      search: z.string().trim().max(120).default("")
    }).safeParse(context.req.query());
    if (!query.success) throw new AppError("INVALID_INPUT", "Invalid admin dashboard query.", 400);
    const config = readConfig(context.env);
    return context.json(await repositories(context).adminDashboard({ ...query.data, timeZone: config.adminTimeZone }));
  });

  app.post("/api/admin/users/:id/suspension", requireAuth, requireAdmin, async (context) => {
    const user = context.get("user");
    const targetUserId = z.uuid().safeParse(context.req.param("id"));
    const body = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none"), reason: z.string().trim().max(500).nullish() }),
      z.object({ kind: z.literal("permanent"), reason: z.string().trim().min(1).max(500) }),
      z.object({ kind: z.literal("days"), days: z.number().int().min(1).max(3650), reason: z.string().trim().min(1).max(500) })
    ]).safeParse(await context.req.json().catch(() => null));
    if (!targetUserId.success || !body.success) throw new AppError("INVALID_INPUT", "Invalid suspension request.", 400);
    if (targetUserId.data === user.id) throw new AppError("FORBIDDEN", "Administrators cannot block their own account.", 403);
    const updated = await repositories(context).setUserSuspension({
      actorUserId: user.id,
      targetUserId: targetUserId.data,
      kind: body.data.kind,
      days: body.data.kind === "days" ? body.data.days : null,
      reason: body.data.reason ?? null
    });
    if (!updated) throw new AppError("NOT_FOUND", "User not found.", 404);
    console.log(JSON.stringify({
      event: "admin_user_suspension_changed", httpRequestId: context.get("httpRequestId"), actorUserId: user.id,
      targetUserId: targetUserId.data, kind: body.data.kind, days: body.data.kind === "days" ? body.data.days : null
    }));
    return context.json({ ok: true });
  });

  app.notFound((context) => context.json(errorPayload(context.get("httpRequestId"), "NOT_FOUND", "Route not found."), 404));
  app.onError((error, context) => {
    const appError = error instanceof AppError ? error : null;
    const cause = appError?.cause;
    console.error(
      JSON.stringify({
        event: "request_failed",
        ...requestFields({
          httpRequestId: context.get("httpRequestId"),
          cfRay: context.req.header("cf-ray") ?? null,
          method: context.req.method,
          path: context.req.path,
          requestStartedAt: context.get("requestStartedAt")
        }),
        status: appError?.status ?? 500,
        errorCode: appError?.code ?? "INTERNAL_ERROR",
        errorType: error instanceof Error ? error.name : "unknown",
        causeType: cause instanceof Error ? cause.name : undefined,
        causeCode: errorProperty(cause, "code") ?? errorProperty(error, "code")
      })
    );
    if (appError) return context.json(errorPayload(context.get("httpRequestId"), appError.code, appError.message), appError.status as 400);
    return context.json(errorPayload(context.get("httpRequestId"), "INTERNAL_ERROR", "An unexpected error occurred."), 500);
  });
  return app;
};
