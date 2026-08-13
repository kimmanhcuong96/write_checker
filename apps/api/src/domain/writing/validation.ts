import { z } from "zod";

export const countWords = (text: string): number => {
  const normalized = text.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
};

export const createWritingRequestSchema = (maximumWords: number) =>
  z
    .object({
      requestId: z.uuid(),
      text: z.string().trim().min(1, "Writing cannot be empty.").max(20_000)
    })
    .superRefine((value, context) => {
      if (countWords(value.text) > maximumWords) {
        context.addIssue({
          code: "custom",
          path: ["text"],
          message: `Writing cannot exceed ${maximumWords} words.`
        });
      }
    });

export type WritingRequest = z.infer<ReturnType<typeof createWritingRequestSchema>>;
