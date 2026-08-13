import { z } from "zod";
import type { RuntimeEnv } from "./runtime/cloudflare/bindings";

const PositiveIntegerString = z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().int().positive());

const ConfigSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]).default("development"),
  APP_ORIGIN: z.url(),
  API_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  LLM_PROVIDER: z.literal("cloudflare"),
  LLM_MODEL: z.string().min(1),
  MAX_WRITING_WORDS: PositiveIntegerString.default(1000),
  MAX_EVALUATIONS_PER_DAY: PositiveIntegerString.default(30),
  LLM_MAX_TOKENS: z.union([PositiveIntegerString, z.undefined()]),
  ADMIN_EMAILS: z.string().default("")
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
  maximumWritingWords: number;
  maximumDailyEvaluations: number;
  maximumLlmTokens: number | null;
  adminEmails: Set<string>;
};

export const readConfig = (env: RuntimeEnv): AppConfig => {
  const value = ConfigSchema.parse(env);
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
    maximumWritingWords: value.MAX_WRITING_WORDS,
    maximumDailyEvaluations: value.MAX_EVALUATIONS_PER_DAY,
    maximumLlmTokens: value.LLM_MAX_TOKENS ?? null,
    adminEmails: new Set(
      value.ADMIN_EMAILS.split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  };
};
