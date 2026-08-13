import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/api/http";
import type { RuntimeEnv } from "../src/infrastructure/runtime/cloudflare/bindings";

const env = {
  ENVIRONMENT: "production",
  APP_ORIGIN: "https://write-checker.pages.dev",
  API_ORIGIN: "https://api.example.test",
  DATABASE_URL: "postgresql://unused.example.test/database",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  SESSION_SECRET: "12345678901234567890123456789012",
  LLM_PROVIDER: "cloudflare",
  LLM_MODEL: "@cf/meta/test-model",
  AI_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  AI_API_TOKEN: "api-token",
  MAX_WRITING_WORDS: "1000",
  MAX_EVALUATIONS_PER_DAY: "30",
  ADMIN_EMAILS: ""
} satisfies RuntimeEnv;

afterEach(() => vi.restoreAllMocks());

describe("HTTP request observability", () => {
  it("logs every completed request with a generated correlation ID", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await createApp().request("/health", {}, env);
    const requestId = response.headers.get("x-request-id");

    expect(response.status).toBe(200);
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/u);
    const event = consoleLog.mock.calls.map(([value]) => JSON.parse(String(value)) as Record<string, unknown>)
      .find((candidate) => candidate.event === "request_completed");
    expect(event).toMatchObject({
      event: "request_completed",
      httpRequestId: requestId,
      method: "GET",
      path: "/health",
      status: 200,
      outcome: "success"
    });
  });

  it("returns and logs the same request ID for a controlled error", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await createApp().request(
      "/api/me",
      { headers: { Origin: env.APP_ORIGIN } },
      env
    );
    const payload = await response.json<{ error: { code: string; requestId: string } }>();

    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-expose-headers")).toBe("X-Request-Id");
    expect(payload.error).toMatchObject({ code: "AUTH_REQUIRED", requestId: response.headers.get("x-request-id") });
    const event = consoleError.mock.calls.map(([value]) => JSON.parse(String(value)) as Record<string, unknown>)
      .find((candidate) => candidate.event === "request_failed");
    expect(event).toMatchObject({
      event: "request_failed",
      httpRequestId: payload.error.requestId,
      method: "GET",
      path: "/api/me",
      status: 401,
      errorCode: "AUTH_REQUIRED",
      errorType: "AppError"
    });
    const completion = consoleLog.mock.calls.map(([value]) => JSON.parse(String(value)) as Record<string, unknown>)
      .find((candidate) => candidate.event === "request_completed");
    expect(completion).toMatchObject({
      event: "request_completed",
      httpRequestId: payload.error.requestId,
      status: 401,
      outcome: "error"
    });
  });
});
