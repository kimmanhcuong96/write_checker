import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/infrastructure/config";
import type { RuntimeEnv } from "../src/infrastructure/runtime/cloudflare/bindings";

const baseEnv = {
  ENVIRONMENT: "production",
  APP_ORIGIN: "https://write-checker.pages.dev",
  API_ORIGIN: "https://api.example.test",
  DATABASE_URL: "postgresql://example.test/database",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  SESSION_SECRET: "12345678901234567890123456789012",
  LLM_PROVIDER: "cloudflare",
  LLM_MODEL: "@cf/meta/test-model",
  AI_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  AI_API_TOKEN: "workers-ai-token",
  MAX_WRITING_WORDS: "1000",
  MAX_EVALUATIONS_PER_DAY: "30",
  ADMIN_EMAILS: ""
} satisfies RuntimeEnv;

describe("Workers AI runtime credentials", () => {
  it("trims accidental surrounding whitespace from dashboard secrets", () => {
    const config = readConfig({
      ...baseEnv,
      AI_ACCOUNT_ID: `  ${baseEnv.AI_ACCOUNT_ID}\n`,
      AI_API_TOKEN: `\n${baseEnv.AI_API_TOKEN}  `
    });

    expect(config.aiAccountId).toBe(baseEnv.AI_ACCOUNT_ID);
    expect(config.aiApiToken).toBe(baseEnv.AI_API_TOKEN);
  });

  it("rejects malformed account IDs and whitespace inside bearer tokens", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => readConfig({ ...baseEnv, AI_ACCOUNT_ID: "not-an-account" })).toThrow("Invalid runtime configuration");
    expect(() => readConfig({ ...baseEnv, AI_API_TOKEN: "Bearer token-value" })).toThrow("Invalid runtime configuration");
    consoleError.mockRestore();
  });
});
