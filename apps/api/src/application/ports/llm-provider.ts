import type { CefrLevel, EvaluationMode, FeedbackLocale, WritingEvaluationResult } from "../../domain/cefr/evaluation";
import type { LlmUsage } from "../../domain/usage/usage";

export type WritingEvaluationInput = { text: string; wordCount: number; mode: EvaluationMode; targetLevel: CefrLevel | null; feedbackLanguage: FeedbackLocale };

export type ProviderEvaluation = {
  result: WritingEvaluationResult;
  usage: LlmUsage;
};

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  evaluateWriting(input: WritingEvaluationInput): Promise<ProviderEvaluation>;
}
