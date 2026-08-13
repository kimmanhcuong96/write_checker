import { CEFR_WRITING_RUBRIC } from "../domain/cefr/rubric";

export const buildEvaluationMessages = (text: string) => [
  {
    role: "system" as const,
    content: `Evaluate only the submitted English writing using this CEFR rubric:\n${CEFR_WRITING_RUBRIC}\nScore every dimension 1-10. Be concise, educational, and evidence-based. Distinguish errors from preferences. Prioritize material corrections. For C2 give refinement/maintenance advice. Do not infer personal facts. Return only the required JSON.`
  },
  { role: "user" as const, content: text }
];
