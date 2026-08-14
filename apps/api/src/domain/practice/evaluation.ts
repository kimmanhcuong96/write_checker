import { z } from "zod";

import { normalizeIeltsBand, normalizeToeicScore, weightedIeltsBand } from "./session";

const feedback = z.array(z.string().trim().min(1).max(500)).min(1).max(8);
const criteria = z.object({ taskAchievement: z.number().min(0).max(9), coherenceCohesion: z.number().min(0).max(9), lexicalResource: z.number().min(0).max(9), grammaticalRangeAccuracy: z.number().min(0).max(9), feedback });
export const IeltsEvaluationSchema = z.object({ kind: z.literal("IELTS"), task1Band: z.number().min(0).max(9), task2Band: z.number().min(0).max(9), overallBand: z.number().min(0).max(9), task1Criteria: criteria, task2Criteria: criteria, strengths: feedback, weaknesses: feedback, improvementSuggestions: feedback });
const toeicQuestionFeedback = z.array(z.object({ questionNumber: z.number().int().min(1).max(8), feedback: z.string().trim().min(1).max(700) })).length(8).superRefine((items, context) => {
  const numbers = new Set(items.map((item) => item.questionNumber));
  if (numbers.size !== 8) context.addIssue({ code: "custom", message: "Feedback for TOEIC questions 1 through 8 is required." });
});
export const ToeicEvaluationSchema = z.object({ kind: z.literal("TOEIC"), estimatedScore: z.number().int().min(0).max(200), questionFeedback: toeicQuestionFeedback, strengths: feedback, weaknesses: feedback, improvementSuggestions: feedback });
export const PracticeEvaluationSchema = z.discriminatedUnion("kind", [IeltsEvaluationSchema, ToeicEvaluationSchema]).transform((result) => {
  if (result.kind === "TOEIC") return { ...result, estimatedScore: normalizeToeicScore(result.estimatedScore) };
  const task1Band = normalizeIeltsBand(result.task1Band);
  const task2Band = normalizeIeltsBand(result.task2Band);
  return { ...result, task1Band, task2Band, overallBand: weightedIeltsBand(task1Band, task2Band) };
});
export type PracticeEvaluation = z.infer<typeof PracticeEvaluationSchema>;
