import { z } from "zod";
import type { RuntimeEnv } from "./runtime/cloudflare/bindings";

const PositiveIntegerString = z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().int().positive());
const IanaTimeZone = z.string().trim().min(1).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Invalid IANA time zone");

const ConfigSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]).default("development"),
  APP_ORIGIN: z.url(),
  API_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  LLM_PROVIDER: z.literal("cloudflare"),
  LLM_MODEL: z.string().regex(/^@[a-z0-9._-]+(?:\/[a-z0-9._-]+){2,}$/iu, "Invalid Workers AI model identifier"),
  AI_ACCOUNT_ID: z.string().trim().regex(/^[a-f0-9]{32}$/iu, "Invalid Cloudflare account ID"),
  AI_API_TOKEN: z.string().trim().min(1).regex(/^\S+$/u, "Workers AI API token must not contain whitespace"),
  MAX_WRITING_WORDS: PositiveIntegerString.default(1000),
  MAX_EVALUATIONS_PER_DAY: PositiveIntegerString.default(30),
  LLM_MAX_TOKENS: PositiveIntegerString.optional(),
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_TIME_ZONE: IanaTimeZone.default("Asia/Ho_Chi_Minh")
});

export type AppConfig = {
  environment: "development" | "production";
  appOrigin: string;
  apiOrigin: string;
  databaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  sessionSecret: string;
  llmProvider: "cloudflare";
  llmModel: string;
  aiAccountId: string;
  aiApiToken: string;
  maximumWritingWords: number;
  maximumDailyEvaluations: number;
  maximumLlmTokens: number | null;
  adminEmails: Set<string>;
  adminTimeZone: string;
};

export const readConfig = (env: RuntimeEnv): AppConfig => {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    console.error(
      JSON.stringify({
        event: "runtime_config_invalid",
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          reason: issue.message
        }))
      })
    );
    throw new Error("Invalid runtime configuration.");
  }
  const value = parsed.data;
  return {
    environment: value.ENVIRONMENT,
    appOrigin: value.APP_ORIGIN.replace(/\/$/u, ""),
    apiOrigin: value.API_ORIGIN.replace(/\/$/u, ""),
    databaseUrl: value.DATABASE_URL,
    googleClientId: value.GOOGLE_CLIENT_ID,
    googleClientSecret: value.GOOGLE_CLIENT_SECRET,
    sessionSecret: value.SESSION_SECRET,
    llmProvider: value.LLM_PROVIDER,
    llmModel: value.LLM_MODEL,
    aiAccountId: value.AI_ACCOUNT_ID,
    aiApiToken: value.AI_API_TOKEN,
    maximumWritingWords: value.MAX_WRITING_WORDS,
    maximumDailyEvaluations: value.MAX_EVALUATIONS_PER_DAY,
    maximumLlmTokens: value.LLM_MAX_TOKENS ?? null,
    adminEmails: new Set(
      value.ADMIN_EMAILS.split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
    adminTimeZone: value.ADMIN_TIME_ZONE
  };
};
