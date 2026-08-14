import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../src/infrastructure/runtime/cloudflare/bindings";

const repository = vi.hoisted(() => ({
  findUserByTokenHash: vi.fn(),
  createPracticeSession: vi.fn(),
  findPracticeSession: vi.fn(),
  finalizePracticeSession: vi.fn()
}));

vi.mock("../src/infrastructure/db/neon/neon-repositories", () => ({
  NeonRepositories: class {
    findUserByTokenHash = repository.findUserByTokenHash;
    createPracticeSession = repository.createPracticeSession;
    findPracticeSession = repository.findPracticeSession;
    finalizePracticeSession = repository.finalizePracticeSession;
  }
}));

import { createApp } from "../src/api/http";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "writer@example.com", displayName: "Writer", avatarUrl: null, blockedUntil: null, permanentlyBlocked: false };
const env = { ENVIRONMENT: "production", APP_ORIGIN: "https://app.example.com", API_ORIGIN: "https://api.example.com", DATABASE_URL: "postgres://example", GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret", SESSION_SECRET: "x".repeat(64), LLM_PROVIDER: "cloudflare", LLM_MODEL: "@cf/meta/model", AI_ACCOUNT_ID: "a".repeat(32), AI_API_TOKEN: "token", MAX_WRITING_WORDS: "1000", MAX_EVALUATIONS_PER_DAY: "30", ADMIN_EMAILS: "", ADMIN_TIME_ZONE: "UTC" } as RuntimeEnv;
const request = (path: string, init: RequestInit = {}) => createApp().request(path, { ...init, headers: { Cookie: "me2write_session=session-token", Origin: env.APP_ORIGIN, ...init.headers } }, env);

describe("practice session HTTP lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findUserByTokenHash.mockResolvedValue(user);
  });

  it("passes the configured topic timer to the server-owned session", async () => {
    repository.createPracticeSession.mockResolvedValue({ id: crypto.randomUUID(), userId: user.id, mode: "TOPIC", category: "GENERAL", examType: null, examVariant: null, status: "IN_PROGRESS", startedAt: new Date().toISOString(), submittedAt: null, timeLimitSeconds: 900, elapsedSeconds: 0, tasks: [], answers: [] });
    const response = await request("/api/practice/sessions", { method: "POST", body: JSON.stringify({ mode: "TOPIC", category: "GENERAL", promptId: "general-01", configuredTimeSeconds: 900 }) });
    expect(response.status).toBe(201);
    expect(repository.createPracticeSession).toHaveBeenCalledWith(expect.objectContaining({ mode: "TOPIC", timeLimitSeconds: 900 }));
  });

  it("rejects unsupported timer values", async () => {
    const response = await request("/api/practice/sessions", { method: "POST", body: JSON.stringify({ mode: "TOPIC", category: "GENERAL", promptId: "general-01", configuredTimeSeconds: 901 }) });
    expect(response.status).toBe(400);
    expect(repository.createPracticeSession).not.toHaveBeenCalled();
  });

  it("validates every exam answer before finalizing", async () => {
    repository.findPracticeSession.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", userId: user.id, mode: "EXAM", category: null, examType: "IELTS", examVariant: "IELTS_ACADEMIC", status: "IN_PROGRESS", startedAt: new Date().toISOString(), submittedAt: null, timeLimitSeconds: 3600, elapsedSeconds: 0, tasks: [{ id: "t1", questionNumber: 1, taskType: "IELTS_ACADEMIC_TASK_1", prompt: "Task 1" }, { id: "t2", questionNumber: 2, taskType: "IELTS_TASK_2", prompt: "Task 2" }], answers: [] });
    const response = await request("/api/practice/sessions/22222222-2222-4222-8222-222222222222/submit", { method: "POST", body: JSON.stringify({ answers: ["Only task one", ""], feedbackLanguage: "en" }) });
    expect(response.status).toBe(400);
    expect(repository.finalizePracticeSession).not.toHaveBeenCalled();
  });
});
