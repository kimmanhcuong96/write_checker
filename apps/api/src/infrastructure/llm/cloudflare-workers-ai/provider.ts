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
    improvementPlan: { type: "array", maxItems: 6, items: { type: "string" } },
    targetAssessment: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            targetLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
            meetsTarget: { type: "boolean" },
            verdict: { type: "string" },
            gapSummary: { type: "array", maxItems: 6, items: { type: "string" } },
            sentenceUpgrades: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, properties: {
              original: { type: "string" }, assessment: { type: "string" }, alternatives: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } }
            }, required: ["original", "assessment", "alternatives"] } },
            vocabularyUpgrades: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, properties: {
              original: { type: "string" }, alternatives: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } }, reason: { type: "string" }
            }, required: ["original", "alternatives", "reason"] } }
          },
          required: ["targetLevel", "meetsTarget", "verdict", "gapSummary", "sentenceUpgrades", "vocabularyUpgrades"]
        }
      ]
    }
  },
  required: ["level", "levelReason", "scores", "strengths", "problems", "corrections", "improvementPlan", "targetAssessment"]
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

const CloudflareApiEnvelopeSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  errors: z
    .array(
      z.object({
        code: z.number().optional(),
        message: z.string().optional()
      })
    )
    .default([])
});

const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com";
const WORKERS_AI_RATE_LIMIT_ERROR = 7505;
const WORKERS_AI_TIMEOUT_MS = 55_000;

const logProviderFailure = (details: {
  reason: "network_error" | "http_error" | "invalid_envelope" | "invalid_json";
  httpStatus?: number;
  cfRay?: string | null;
  errors?: Array<{ code?: number | undefined; message?: string | undefined }>;
  errorType?: string;
  networkErrorKind?: "invalid_receiver" | "invalid_header" | "invalid_url" | "subrequest_failed" | "unknown";
}) => {
  console.error(
    JSON.stringify({
      event: "workers_ai_request_failed",
      ...details,
      errors: details.errors?.slice(0, 5)
    })
  );
};

const classifyNetworkError = (error: unknown): "invalid_receiver" | "invalid_header" | "invalid_url" | "subrequest_failed" | "unknown" => {
  if (!(error instanceof Error)) return "unknown";
  const message = error.message.toLowerCase();
  if (message.includes("illegal invocation") || message.includes("incorrect this")) return "invalid_receiver";
  if (message.includes("header") || message.includes("character")) return "invalid_header";
  if (message.includes("url")) return "invalid_url";
  if (message.includes("fetch") || message.includes("network") || message.includes("subrequest")) return "subrequest_failed";
  return "unknown";
};

export class CloudflareWorkersAIProvider implements LLMProvider {
  readonly name = "cloudflare";

  constructor(
    private readonly accountId: string,
    private readonly apiToken: string,
    readonly model: string,
    private readonly fetcher?: typeof fetch
  ) {}

  async evaluateWriting(input: WritingEvaluationInput): Promise<ProviderEvaluation> {
    let response: Response;
    try {
      // Keep the platform global as a direct fetch() call. Calling a captured
      // Web API function as this.fetcher() supplies the provider instance as
      // its receiver and workerd rejects it with "Illegal invocation".
      const executeFetch: typeof fetch = this.fetcher ?? ((resource, init) => fetch(resource, init));
      response = await executeFetch(this.endpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: buildEvaluationMessages(input),
          temperature: 0.2,
          max_tokens: input.mode === "targeted" ? 2000 : 1400,
          response_format: { type: "json_schema", json_schema: responseSchema }
        }),
        signal: AbortSignal.timeout(WORKERS_AI_TIMEOUT_MS)
      });
    } catch (error) {
      logProviderFailure({
        reason: "network_error",
        errorType: error instanceof Error ? error.name : "unknown",
        networkErrorKind: classifyNetworkError(error)
      });
      throw new AppError("PROVIDER_UNAVAILABLE", "The writing evaluator is temporarily unavailable.", 503, error);
    }

    let rawEnvelope: unknown;
    try {
      rawEnvelope = await response.json();
    } catch (error) {
      logProviderFailure({
        reason: "invalid_json",
        httpStatus: response.status,
        cfRay: response.headers.get("cf-ray"),
        errorType: error instanceof Error ? error.name : "unknown"
      });
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned an invalid response.", 502, error);
    }

    const apiEnvelope = CloudflareApiEnvelopeSchema.safeParse(rawEnvelope);
    if (!apiEnvelope.success) {
      logProviderFailure({
        reason: "invalid_envelope",
        httpStatus: response.status,
        cfRay: response.headers.get("cf-ray")
      });
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned an invalid response.", 502, apiEnvelope.error);
    }
    if (!response.ok || !apiEnvelope.data.success) {
      logProviderFailure({
        reason: "http_error",
        httpStatus: response.status,
        cfRay: response.headers.get("cf-ray"),
        errors: apiEnvelope.data.errors
      });
      const isQuotaError =
        response.status === 429 || apiEnvelope.data.errors.some((error) => error.code === WORKERS_AI_RATE_LIMIT_ERROR);
      throw new AppError(
        isQuotaError ? "AI_QUOTA_UNAVAILABLE" : "PROVIDER_UNAVAILABLE",
        isQuotaError ? "The AI evaluation quota is temporarily unavailable." : "The writing evaluator is temporarily unavailable.",
        503,
        apiEnvelope.data.errors
      );
    }

    const envelope = AiResponseSchema.safeParse(apiEnvelope.data.result);
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
    const targetMismatch =
      (input.mode === "estimate" && result.data.targetAssessment !== null) ||
      (input.mode === "targeted" &&
        (result.data.targetAssessment === null || result.data.targetAssessment.targetLevel !== input.targetLevel));
    if (targetMismatch) {
      throw new AppError("INVALID_PROVIDER_OUTPUT", "The evaluator returned feedback for the wrong evaluation mode.", 502);
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

  private endpoint(): string {
    const modelPath = this.model
      .split("/")
      .map((segment) => encodeURIComponent(segment).replace(/^%40/u, "@"))
      .join("/");
    return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai/run/${modelPath}`;
  }
}
