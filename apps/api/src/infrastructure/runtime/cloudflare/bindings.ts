/** Secret names are declared separately because Wrangler configuration must not contain secret values. */
export type RuntimeEnv = Env & {
  ENVIRONMENT: "development" | "production";
  APP_ORIGIN: string;
  API_ORIGIN: string;
  LLM_PROVIDER: "cloudflare";
  LLM_MODEL: string;
  MAX_WRITING_WORDS: string;
  MAX_EVALUATIONS_PER_DAY: string;
  ADMIN_EMAILS: string;
  ADMIN_TIME_ZONE?: string;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  AI_ACCOUNT_ID: string;
  AI_API_TOKEN: string;
  LLM_MAX_TOKENS?: string;
};
