import { CEFR_WRITING_RUBRIC } from "../domain/cefr/rubric";
import type { WritingEvaluationInput } from "./ports/llm-provider";

export const buildEvaluationMessages = (input: WritingEvaluationInput) => [
  {
    role: "system" as const,
    content: `Evaluate only the submitted English writing using this CEFR rubric:\n${CEFR_WRITING_RUBRIC}\nScore every dimension 1-10. Be concise, educational, and evidence-based. Distinguish errors from preferences. Prioritize material corrections. For C2 give refinement/maintenance advice. Do not infer personal facts. Write explanations and coaching in ${({ en: "English", vi: "Vietnamese", zh: "Simplified Chinese", ja: "Japanese" } as const)[input.feedbackLanguage]}, while preserving quoted English originals and replacements. ${input.mode === "targeted" ? `The learner asks whether this writing meets CEFR ${input.targetLevel}. Compare the actual evidence with that exact target. Set targetAssessment to a detailed object: verdict, specific gaps, sentence-level assessments with natural alternatives, and vocabulary upgrades. Do not inflate the level.` : "Estimate the current level independently and set targetAssessment to null."} Return only the required JSON.`
  },
  { role: "user" as const, content: input.text }
];
