import { z } from "zod";

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const CefrLevelSchema = z.enum(cefrLevels);
export const EvaluationModeSchema = z.enum(["estimate", "targeted"]);
export const FeedbackLocaleSchema = z.enum(["en", "vi", "zh", "ja"]);

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
  improvementPlan: FeedbackListSchema,
  targetAssessment: z.object({
    targetLevel: CefrLevelSchema,
    meetsTarget: z.boolean(),
    verdict: z.string().trim().min(1).max(700),
    gapSummary: FeedbackListSchema,
    sentenceUpgrades: z.array(z.object({
      original: z.string().trim().min(1).max(500),
      assessment: z.string().trim().min(1).max(500),
      alternatives: z.array(z.string().trim().min(1).max(500)).min(1).max(3)
    })).max(8),
    vocabularyUpgrades: z.array(z.object({
      original: z.string().trim().min(1).max(120),
      alternatives: z.array(z.string().trim().min(1).max(120)).min(1).max(4),
      reason: z.string().trim().min(1).max(400)
    })).max(8)
  }).nullable()
});

export type CefrLevel = z.infer<typeof CefrLevelSchema>;
export type EvaluationMode = z.infer<typeof EvaluationModeSchema>;
export type FeedbackLocale = z.infer<typeof FeedbackLocaleSchema>;
export type WritingEvaluationResult = z.infer<typeof WritingEvaluationResultSchema>;

export const nextCefrLevel = (level: CefrLevel): CefrLevel | null => {
  const index = cefrLevels.indexOf(level);
  return index === cefrLevels.length - 1 ? null : (cefrLevels[index + 1] ?? null);
};
