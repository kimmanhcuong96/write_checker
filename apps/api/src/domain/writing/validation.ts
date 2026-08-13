import { z } from "zod";
import { CefrLevelSchema, FeedbackLocaleSchema } from "../cefr/evaluation";

export const countWords = (text: string): number => {
  const normalized = text.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
};

export const createWritingRequestSchema = (maximumWords: number) =>
  z
    .object({
      requestId: z.uuid(),
      text: z.string().trim().min(1, "Writing cannot be empty.").max(20_000),
      mode: z.enum(["estimate", "targeted"]).default("estimate"),
      targetLevel: CefrLevelSchema.nullish(),
      feedbackLanguage: FeedbackLocaleSchema.default("en")
    })
    .superRefine((value, context) => {
      if (countWords(value.text) > maximumWords) {
        context.addIssue({
          code: "custom",
          path: ["text"],
          message: `Writing cannot exceed ${maximumWords} words.`
        });
      }
      if (value.mode === "targeted" && !value.targetLevel) {
        context.addIssue({ code: "custom", path: ["targetLevel"], message: "A target CEFR level is required." });
      }
      if (value.mode === "estimate" && value.targetLevel) {
        context.addIssue({ code: "custom", path: ["targetLevel"], message: "Target level is only valid in targeted mode." });
      }
    });

export type WritingRequest = z.infer<ReturnType<typeof createWritingRequestSchema>>;
