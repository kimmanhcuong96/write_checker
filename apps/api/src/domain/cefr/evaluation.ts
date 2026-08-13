import { z } from "zod";

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const CefrLevelSchema = z.enum(cefrLevels);

const ScoreSchema = z.number().int().min(1).max(10);
const FeedbackListSchema = z.array(z.string().trim().min(1).max(300)).max(6);

export const WritingEvaluationResultSchema = z.object({
  level: CefrLevelSchema,
  levelReason: z.string().trim().min(1).max(700),
  scores: z.object({
    grammar: ScoreSchema,
    vocabulary: ScoreSchema,
    sentenceComplexity: ScoreSchema,
    coherence: ScoreSchema,
    cohesion: ScoreSchema,
    communicativeEffectiveness: ScoreSchema,
    naturalness: ScoreSchema
  }),
  strengths: FeedbackListSchema,
  problems: FeedbackListSchema,
  corrections: z
    .array(
      z.object({
        original: z.string().trim().min(1).max(500),
        better: z.string().trim().min(1).max(500),
        explanation: z.string().trim().min(1).max(500)
      })
    )
    .max(8),
  improvementPlan: FeedbackListSchema
});

export type CefrLevel = z.infer<typeof CefrLevelSchema>;
export type WritingEvaluationResult = z.infer<typeof WritingEvaluationResultSchema>;

export const nextCefrLevel = (level: CefrLevel): CefrLevel | null => {
  const index = cefrLevels.indexOf(level);
  return index === cefrLevels.length - 1 ? null : (cefrLevels[index + 1] ?? null);
};
