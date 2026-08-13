import { z } from "zod";
import type { ExternalIdentity } from "../../../domain/users/user";
import { AppError } from "../../../application/errors";

const TokenResponseSchema = z.object({ access_token: z.string().min(1), token_type: z.string() });
const UserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.url().optional()
});

export class GoogleOAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string
  ) {}

  authorizationUrl(state: string, codeChallenge: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account"
    }).toString();
    return url.toString();
  }

  async exchange(code: string, verifier: string): Promise<ExternalIdentity> {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier
      })
    });
    if (!tokenResponse.ok) throw new AppError("AUTH_REQUIRED", "Google sign-in could not be completed.", 401);
    const token = TokenResponseSchema.safeParse(await tokenResponse.json());
    if (!token.success) throw new AppError("AUTH_REQUIRED", "Google returned an invalid token response.", 401);

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token.data.access_token}` }
    });
    if (!profileResponse.ok) throw new AppError("AUTH_REQUIRED", "Google profile verification failed.", 401);
    const profile = UserInfoSchema.safeParse(await profileResponse.json());
    if (!profile.success || (profile.data.email && profile.data.email_verified === false)) {
      throw new AppError("AUTH_REQUIRED", "Google returned an invalid user profile.", 401);
    }
    return {
      subject: profile.data.sub,
      email: profile.data.email ?? null,
      displayName: profile.data.name ?? null,
      avatarUrl: profile.data.picture ?? null
    };
  }
}
