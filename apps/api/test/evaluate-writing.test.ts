import { describe, expect, it, vi } from "vitest";
import { EvaluateWritingService } from "../src/application/services/evaluate-writing";
import type { LLMProvider } from "../src/application/ports/llm-provider";
import type { EvaluationRecord, EvaluationRepository } from "../src/application/ports/repositories";
import type { WritingEvaluationResult } from "../src/domain/cefr/evaluation";

const result: WritingEvaluationResult = {
  level: "B1",
  levelReason: "The text communicates connected ideas with reasonable control.",
  scores: { grammar: 6, vocabulary: 6, sentenceComplexity: 5, coherence: 6, cohesion: 5, communicativeEffectiveness: 6, naturalness: 5 },
  strengths: ["The main message is clear."],
  problems: ["Sentence patterns are repetitive."],
  corrections: [],
  improvementPlan: ["Vary sentence openings."]
};

const record = (status: EvaluationRecord["status"], evaluation: WritingEvaluationResult | null): EvaluationRecord => ({
  id: crypto.randomUUID(), userId: crypto.randomUUID(), requestId: crypto.randomUUID(), status, result: evaluation
});

function repository(claim: EvaluationRepository["claim"]): EvaluationRepository {
  return {
    claim,
    findById: vi.fn(() => Promise.resolve(null)),
    complete: vi.fn(() => Promise.resolve()),
    fail: vi.fn(() => Promise.resolve()),
    consumedTokens: vi.fn(() => Promise.resolve(0)),
    usageDashboard: vi.fn(() => Promise.resolve({ summaries: [], breakdown: [] }))
    ,countEvaluationsSince: vi.fn(() => Promise.resolve(0))
  };
}

function provider(evaluateWriting: LLMProvider["evaluateWriting"]): LLMProvider {
  return {
    name: "test",
    model: "test-model",
    evaluateWriting
  };
}

describe("EvaluateWritingService cost protection", () => {
  it("returns a completed idempotent request without calling the provider", async () => {
    const existing = record("completed", result);
    const evaluate = vi.fn(() => Promise.resolve({ result, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, providerUsageValue: null, providerUsageUnit: null } }));
    const llm = provider(evaluate);
    const service = new EvaluateWritingService(repository(vi.fn(() => Promise.resolve({ record: existing, created: false }))), llm, null, 30);
    const response = await service.execute({ requestId: existing.requestId, userId: existing.userId, text: "Existing text", wordCount: 2 });
    expect(response).toEqual(existing);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("stops before inference when the configured token ceiling is reached", async () => {
    const fresh = record("processing", null);
    const db = repository(vi.fn(() => Promise.resolve({ record: fresh, created: true })));
    db.consumedTokens = vi.fn(() => Promise.resolve(100));
    const fail = vi.fn(() => Promise.resolve());
    db.fail = fail;
    const evaluate = vi.fn(() => Promise.resolve({ result, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, providerUsageValue: null, providerUsageUnit: null } }));
    const llm = provider(evaluate);
    const service = new EvaluateWritingService(db, llm, 100, 30);
    await expect(service.execute({ requestId: fresh.requestId, userId: fresh.userId, text: "New text", wordCount: 2 })).rejects.toMatchObject({ code: "AI_QUOTA_UNAVAILABLE" });
    expect(evaluate).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledOnce();
  });

  it("enforces the rolling per-user request limit before inference", async () => {
    const fresh = record("processing", null);
    const db = repository(vi.fn(() => Promise.resolve({ record: fresh, created: true })));
    db.countEvaluationsSince = vi.fn(() => Promise.resolve(31));
    const evaluate = vi.fn(() => Promise.resolve({ result, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, providerUsageValue: null, providerUsageUnit: null } }));
    const llm = provider(evaluate);
    const service = new EvaluateWritingService(db, llm, null, 30);
    await expect(service.execute({ requestId: fresh.requestId, userId: fresh.userId, text: "New text", wordCount: 2 })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("identifies a daily-limit database failure instead of misreporting the AI provider", async () => {
    const fresh = record("processing", null);
    const db = repository(vi.fn(() => Promise.resolve({ record: fresh, created: true })));
    db.countEvaluationsSince = vi.fn(() => Promise.reject(Object.assign(new Error("database unavailable"), { code: "XX000" })));
    const evaluate = vi.fn(() => Promise.resolve({ result, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, providerUsageValue: null, providerUsageUnit: null } }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = new EvaluateWritingService(db, provider(evaluate), null, 30);

    await expect(
      service.execute({ requestId: fresh.requestId, userId: fresh.userId, text: "New text", wordCount: 2 })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
    expect(evaluate).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({
        event: "evaluation_pipeline_failed",
        stage: "daily_limit_check",
        evaluationRequestId: fresh.requestId,
        errorType: "Error",
        errorCode: "XX000"
      })
    );
    consoleError.mockRestore();
  });
});
