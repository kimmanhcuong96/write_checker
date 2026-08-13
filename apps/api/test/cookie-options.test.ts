import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { describe, expect, it } from "vitest";
import { authCookieOptions } from "../src/infrastructure/auth/cookie-options";

describe("authentication cookie policy", () => {
  it("allows the production session across the Pages and Workers sites", () => {
    expect(authCookieOptions({ environment: "production" }, 1_800)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 1_800
    });
  });

  it("keeps local HTTP development compatible and same-site", () => {
    expect(authCookieOptions({ environment: "development" }, 600)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 600
    });
  });

  it("serializes the required production Set-Cookie attributes", async () => {
    const app = new Hono();
    app.get("/", (context) => {
      setCookie(context, "session", "opaque-token", authCookieOptions({ environment: "production" }, 600));
      return context.body(null, 204);
    });

    const response = await app.request("/");
    const setCookieHeader = response.headers.get("set-cookie");

    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Secure");
    expect(setCookieHeader).toContain("SameSite=None");
    expect(setCookieHeader).toContain("Path=/");
  });
});
