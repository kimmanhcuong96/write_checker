import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../src/infrastructure/runtime/cloudflare/bindings";

const repository = vi.hoisted(() => ({
  findUserByTokenHash: vi.fn(),
  adminDashboard: vi.fn(),
  setUserSuspension: vi.fn()
}));

vi.mock("../src/infrastructure/db/neon/neon-repositories", () => ({
  NeonRepositories: class {
    findUserByTokenHash = repository.findUserByTokenHash;
    adminDashboard = repository.adminDashboard;
    setUserSuspension = repository.setUserSuspension;
  }
}));

import { createApp } from "../src/api/http";

const adminId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const baseUser = {
  id: adminId,
  email: "admin@example.com",
  displayName: "Admin",
  avatarUrl: null,
  blockedUntil: null,
  permanentlyBlocked: false
};
const env = {
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
  ADMIN_TIME_ZONE: "Asia/Ho_Chi_Minh"
} as RuntimeEnv;

const request = (path: string, init: RequestInit = {}) => createApp().request(path, {
  ...init,
  headers: { Cookie: "me2write_session=session-token", Origin: env.APP_ORIGIN, ...init.headers }
}, env);

describe("admin HTTP authorization and suspensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findUserByTokenHash.mockResolvedValue(baseUser);
    repository.setUserSuspension.mockResolvedValue(true);
  });

  it("denies dashboard access to a non-administrator", async () => {
    repository.findUserByTokenHash.mockResolvedValue({ ...baseUser, email: "member@example.com" });
    const response = await request("/api/admin/dashboard");
    expect(response.status).toBe(403);
    expect(repository.adminDashboard).not.toHaveBeenCalled();
  });

  it("passes pagination and the configured time zone to the dashboard query", async () => {
    repository.adminDashboard.mockResolvedValue({ reportTimeZone: env.ADMIN_TIME_ZONE, summaries: [], breakdown: [], users: [], userPage: { page: 2, pageSize: 25, total: 0 } });
    const response = await request("/api/admin/dashboard?page=2&pageSize=25&search=kim");
    expect(response.status).toBe(200);
    expect(repository.adminDashboard).toHaveBeenCalledWith({ page: 2, pageSize: 25, search: "kim", timeZone: env.ADMIN_TIME_ZONE });
  });

  it("prevents administrators from suspending themselves", async () => {
    const response = await request(`/api/admin/users/${adminId}/suspension`, {
      method: "POST",
      body: JSON.stringify({ kind: "permanent", reason: "security review" })
    });
    expect(response.status).toBe(403);
    expect(repository.setUserSuspension).not.toHaveBeenCalled();
  });

  it("validates and records a bounded suspension", async () => {
    const response = await request(`/api/admin/users/${targetId}/suspension`, {
      method: "POST",
      body: JSON.stringify({ kind: "days", days: 14, reason: "abuse" })
    });
    expect(response.status).toBe(200);
    expect(repository.setUserSuspension).toHaveBeenCalledWith({ actorUserId: adminId, targetUserId: targetId, kind: "days", days: 14, reason: "abuse" });
  });

  it("blocks evaluation before calling an AI provider", async () => {
    repository.findUserByTokenHash.mockResolvedValue({ ...baseUser, permanentlyBlocked: true });
    const response = await request("/api/evaluations", {
      method: "POST",
      body: JSON.stringify({ requestId: crypto.randomUUID(), text: "This is a complete sentence for evaluation.", mode: "estimate", targetLevel: null, feedbackLanguage: "en" })
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "USER_BLOCKED" } });
  });
});
