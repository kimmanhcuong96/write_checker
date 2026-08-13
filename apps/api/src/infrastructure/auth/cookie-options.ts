import type { AppConfig } from "../config";

type CookieEnvironment = Pick<AppConfig, "environment">;

/**
 * The current production frontend and API are on different sites
 * (pages.dev and workers.dev), so browsers require SameSite=None together
 * with Secure for credentialed API requests. Local HTTP development remains
 * SameSite=Lax because Secure cookies are not usable there.
 */
export const authCookieOptions = (config: CookieEnvironment, maxAge: number) => ({
  httpOnly: true,
  secure: config.environment === "production",
  sameSite: config.environment === "production" ? ("None" as const) : ("Lax" as const),
  path: "/",
  maxAge
});
