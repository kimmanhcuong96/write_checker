import { z } from "zod";
import { AppError } from "../../../application/errors";
import type { LLMProvider, ProviderEvaluation, WritingEvaluationInput } from "../../../application/ports/llm-provider";
import { buildEvaluationMessages } from "../../../application/prompt";
import { WritingEvaluationResultSchema } from "../../../domain/cefr/evaluation";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    levelReason: { type: "string" },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        grammar: { type: "integer", minimum: 1, maximum: 10 },
        vocabulary: { type: "integer", minimum: 1, maximum: 10 },
        sentenceComplexity: { type: "integer", minimum: 1, maximum: 10 },
        coherence: { type: "integer", minimum: 1, maximum: 10 },
        cohesion: { type: "integer", minimum: 1, maximum: 10 },
        communicativeEffectiveness: { type: "integer", minimum: 1, maximum: 10 },
        naturalness: { type: "integer", minimum: 1, maximum: 10 }
      },
      required: ["grammar", "vocabulary", "sentenceComplexity", "coherence", "cohesion", "communicativeEffectiveness", "naturalness"]
    },
    strengths: { type: "array", maxItems: 6, items: { type: "string" } },
    problems: { type: "array", maxItems: 6, items: { type: "string" } },
    corrections: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { original: { type: "string" }, better: { type: "string" }, explanation: { type: "string" } },
        required: ["original", "better", "explanation"]
      }
    },
    improvementPlan: { type: "array", maxItems: 6, items: { type: "string" } }
  },
  required: ["level", "levelReason", "scores", "strengths", "problems", "corrections", "improvementPlan"]
} as const;

const AiResponseSchema = z.object({
  response: z.unknown(),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional()
    })
    .optional()
});

export class CloudflareWorkersAIProvider implements LLMProvider {
  readonly name = "cloudflare";

  constructor(
    private readonly ai: Ai,
    readonly model: string
  ) {}

  async evaluateWriting(input: WritingEvaluationInput): Promise<ProviderEvaluation> {
    let raw: unknown;
    try {
      raw = await this.ai.run(this.model, {
        messages: buildEvaluationMessages(input.text),
        temperature: 0.2,
        max_tokens: 1400,
        response_format: { type: "json_schema", json_schema: responseSchema }
      });
    } catch (error) {
      throw new AppError("PROVIDER_UNAVAILABLE", "The writing evaluator is temporarily unavailable.", 503, error);
    }

    const envelope = AiResponseSchema.safeParse(raw);
    if (!envelope.success) {
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned an invalid response.", 502, envelope.error);
    }
    const candidate =
      typeof envelope.data.response === "string"
        ? this.parseJson(envelope.data.response)
        : envelope.data.response;
    const result = WritingEvaluationResultSchema.safeParse(candidate);
    if (!result.success) {
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned feedback in an invalid format.", 502, result.error);
    }
    const usage = envelope.data.usage;
    return {
      result: result.data,
      usage: {
        inputTokens: usage?.prompt_tokens ?? usage?.input_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? usage?.output_tokens ?? null,
        totalTokens: usage?.total_tokens ?? ((usage?.prompt_tokens ?? usage?.input_tokens ?? 0) + (usage?.completion_tokens ?? usage?.output_tokens ?? 0) || null),
        providerUsageValue: null,
        providerUsageUnit: null
      }
    };
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned malformed JSON.", 502, error);
    }
  }
}
