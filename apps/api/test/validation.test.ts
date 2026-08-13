import { describe, expect, it } from "vitest";
import { WritingEvaluationResultSchema } from "../src/domain/cefr/evaluation";
import { countWords, createWritingRequestSchema } from "../src/domain/writing/validation";

describe("writing request validation", () => {
  it("counts whitespace-separated words and enforces the configured maximum", () => {
    expect(countWords("  One\n two   three ")).toBe(3);
    const result = createWritingRequestSchema(2).safeParse({ requestId: crypto.randomUUID(), text: "one two three" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only writing", () => {
    expect(createWritingRequestSchema(1000).safeParse({ requestId: crypto.randomUUID(), text: "   \n" }).success).toBe(false);
  });
});

describe("provider result validation", () => {
  const valid = {
    level: "B2",
    levelReason: "Clear and detailed, with minor limitations.",
    scores: { grammar: 8, vocabulary: 7, sentenceComplexity: 7, coherence: 8, cohesion: 7, communicativeEffectiveness: 8, naturalness: 7 },
    strengths: ["Clear organization"], problems: ["Some imprecise wording"],
    corrections: [{ original: "make a party", better: "have a party", explanation: "Use the natural collocation." }],
    improvementPlan: ["Use more precise collocations."]
  };

  it("accepts the normalized result and rejects out-of-range scores", () => {
    expect(WritingEvaluationResultSchema.safeParse(valid).success).toBe(true);
    expect(WritingEvaluationResultSchema.safeParse({ ...valid, scores: { ...valid.scores, grammar: 11 } }).success).toBe(false);
  });
});
