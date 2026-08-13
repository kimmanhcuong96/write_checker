import { describe, expect, it } from "vitest";
import { readConfig } from "../src/infrastructure/config";
import type { RuntimeEnv } from "../src/infrastructure/runtime/cloudflare/bindings";

const environment = (overrides: Partial<RuntimeEnv> = {}): RuntimeEnv => ({
  ENVIRONMENT: "production",
  APP_ORIGIN: "https://app.example.com",
  API_ORIGIN: "https://api.example.com",
  DATABASE_URL: "postgres://example",
  GOOGLE_CLIENT_ID: "client",
  GOOGLE_CLIENT_SECRET: "secret",
  SESSION_SECRET: "x".repeat(64),
  LLM_PROVIDER: "cloudflare",
  LLM_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  AI_ACCOUNT_ID: "a".repeat(32),
  AI_API_TOKEN: "token",
  MAX_WRITING_WORDS: "1000",
  MAX_EVALUATIONS_PER_DAY: "30",
  ADMIN_EMAILS: "admin@example.com",
  ...overrides
});

describe("runtime configuration", () => {
  it("defaults administrative reporting to Vietnam time", () => {
    expect(readConfig(environment()).adminTimeZone).toBe("Asia/Ho_Chi_Minh");
  });

  it("accepts an explicit IANA reporting time zone", () => {
    expect(readConfig(environment({ ADMIN_TIME_ZONE: "Asia/Ho_Chi_Minh" })).adminTimeZone).toBe("Asia/Ho_Chi_Minh");
  });

  it("rejects an invalid reporting time zone", () => {
    expect(() => readConfig(environment({ ADMIN_TIME_ZONE: "GMT+7-invalid" }))).toThrow("Invalid runtime configuration");
  });
});
