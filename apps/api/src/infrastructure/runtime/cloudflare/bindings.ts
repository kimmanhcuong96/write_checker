/** Secret names are declared separately because Wrangler configuration must not contain secret values. */
export type RuntimeEnv = Env & {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  LLM_MAX_TOKENS?: string;
};
