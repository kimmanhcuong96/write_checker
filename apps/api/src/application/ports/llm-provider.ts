import type { CefrLevel, EvaluationMode, FeedbackLocale, WritingEvaluationResult } from "../../domain/cefr/evaluation";
import type { LlmUsage } from "../../domain/usage/usage";
import type { PracticeEvaluation } from "../../domain/practice/evaluation";

export type EvaluationTaskContext = { questionNumber: number; taskType: string; prompt: string; visualDescription?: string | undefined; providedWords?: readonly [string, string] | undefined; wordMinimum?: number | undefined };
export type WritingEvaluationContext = { mode: "TOPIC" | "IELTS" | "TOEIC"; category?: "GENERAL" | "IELTS" | undefined; promptId?: string | undefined; prompt?: string | undefined; examType?: "IELTS" | "TOEIC" | undefined; examVariant?: "IELTS_ACADEMIC" | "IELTS_GENERAL" | undefined; tasks?: readonly EvaluationTaskContext[] | undefined };
export type WritingEvaluationInput = { text: string; wordCount: number; mode: EvaluationMode; targetLevel: CefrLevel | null; feedbackLanguage: FeedbackLocale; context?: WritingEvaluationContext };

export type ProviderEvaluation = {
  result: WritingEvaluationResult | PracticeEvaluation;
  usage: LlmUsage;
};

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  evaluateWriting(input: WritingEvaluationInput): Promise<ProviderEvaluation>;
}
