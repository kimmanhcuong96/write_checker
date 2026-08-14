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

  it("requires a CEFR target only in targeted mode", () => {
    const schema = createWritingRequestSchema(1000);
    const base = { requestId: crypto.randomUUID(), text: "I write a short paragraph." };
    expect(schema.safeParse({ ...base, mode: "targeted" }).success).toBe(false);
    expect(schema.safeParse({ ...base, mode: "targeted", targetLevel: "C1", feedbackLanguage: "vi" }).success).toBe(true);
    expect(schema.safeParse({ ...base, mode: "estimate", targetLevel: "B2" }).success).toBe(false);
  });

  it("defaults feedback to English and rejects unsupported locales", () => {
    const schema = createWritingRequestSchema(1000);
    const base = { requestId: crypto.randomUUID(), text: "This is a valid sentence." };
    const parsed = schema.safeParse(base);
    expect(parsed.success && parsed.data.feedbackLanguage).toBe("en");
    expect(schema.safeParse({ ...base, feedbackLanguage: "fr" }).success).toBe(false);
  });

  it("does not expose trusted practice evaluation context on the public evaluation request", () => {
    const parsed = createWritingRequestSchema(1000).parse({ requestId: crypto.randomUUID(), text: "A valid response.", context: { mode: "IELTS" } });
    expect("context" in parsed).toBe(false);
  });
});

describe("provider result validation", () => {
  const valid = {
    level: "B2",
    levelReason: "Clear and detailed, with minor limitations.",
    scores: { grammar: 8, vocabulary: 7, sentenceComplexity: 7, coherence: 8, cohesion: 7, communicativeEffectiveness: 8, naturalness: 7 },
    strengths: ["Clear organization"], problems: ["Some imprecise wording"],
    corrections: [{ original: "make a party", better: "have a party", explanation: "Use the natural collocation." }],
    improvementPlan: ["Use more precise collocations."],
    targetAssessment: null
  };

  it("accepts the normalized result and rejects out-of-range scores", () => {
    expect(WritingEvaluationResultSchema.safeParse(valid).success).toBe(true);
    expect(WritingEvaluationResultSchema.safeParse({ ...valid, scores: { ...valid.scores, grammar: 11 } }).success).toBe(false);
  });

  it("accepts detailed target-level coaching", () => {
    expect(WritingEvaluationResultSchema.safeParse({
      ...valid,
      targetAssessment: {
        targetLevel: "B2",
        meetsTarget: false,
        verdict: "The argument is clear, but language control is not consistently B2 yet.",
        gapSummary: ["Use a wider range of linking devices."],
        sentenceUpgrades: [{ original: "I think it is good.", assessment: "Too general for the intended argument.", alternatives: ["This approach is beneficial because..."] }],
        vocabularyUpgrades: [{ original: "good", alternatives: ["beneficial", "effective"], reason: "Use a more precise adjective." }]
      }
    }).success).toBe(true);
  });
});
