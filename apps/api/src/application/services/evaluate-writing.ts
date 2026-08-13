import { AppError } from "../errors";
import type { LLMProvider } from "../ports/llm-provider";
import type { EvaluationRecord, EvaluationRepository } from "../ports/repositories";

type EvaluationStage = "token_quota_check" | "daily_limit_check" | "provider_evaluation" | "result_persistence";

const logPipelineFailure = (stage: EvaluationStage | "failure_persistence", evaluationRequestId: string, error: unknown) => {
  console.error(
    JSON.stringify({
      event: "evaluation_pipeline_failed",
      stage,
      evaluationRequestId,
      errorType: error instanceof AppError ? error.code : error instanceof Error ? error.name : "unknown",
      errorCode:
        typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
          ? error.code
          : undefined
    })
  );
};

export class EvaluateWritingService {
  constructor(
    private readonly evaluations: EvaluationRepository,
    private readonly llm: LLMProvider,
    private readonly maximumTokens: number | null,
    private readonly maximumDailyEvaluations: number
  ) {}

  async execute(input: {
    requestId: string;
    userId: string;
    text: string;
    wordCount: number;
  }): Promise<EvaluationRecord> {
    const claim = await this.evaluations.claim({
      ...input,
      provider: this.llm.name,
      model: this.llm.model
    });

    if (!claim) {
      throw new AppError("DUPLICATE_REQUEST", "This request identifier is already in use.", 409);
    }
    if (!claim.created) {
      if (claim.record.status === "completed") return claim.record;
      if (claim.record.status === "processing") {
        throw new AppError("EVALUATION_IN_PROGRESS", "This evaluation is already being processed.", 409);
      }
      throw new AppError("EVALUATION_FAILED", "This request failed previously. Submit again to create a new request.", 409);
    }

    const emptyUsage = {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      providerUsageValue: null,
      providerUsageUnit: null
    };

    let stage: EvaluationStage = "token_quota_check";
    try {
      if (this.maximumTokens !== null) {
        const consumed = await this.evaluations.consumedTokens();
        if (consumed >= this.maximumTokens) {
          await this.evaluations.fail(claim.record.id, emptyUsage, "quota_exceeded");
          throw new AppError("AI_QUOTA_UNAVAILABLE", "AI evaluation is temporarily unavailable because the configured usage limit has been reached.", 503);
        }
      }

      stage = "daily_limit_check";
      const dailyCount = await this.evaluations.countEvaluationsSince(input.userId, new Date(Date.now() - 24 * 60 * 60 * 1000));
      if (dailyCount > this.maximumDailyEvaluations) {
        await this.evaluations.fail(claim.record.id, emptyUsage, "rate_limited");
        throw new AppError("RATE_LIMITED", "You have reached the daily evaluation limit. Please try again tomorrow.", 429);
      }

      stage = "provider_evaluation";
      const providerResult = await this.llm.evaluateWriting({ text: input.text, wordCount: input.wordCount });
      stage = "result_persistence";
      await this.evaluations.complete(claim.record.id, providerResult.result, providerResult.usage);
      return { ...claim.record, status: "completed", result: providerResult.result };
    } catch (error) {
      if (error instanceof AppError && (error.code === "AI_QUOTA_UNAVAILABLE" || error.code === "RATE_LIMITED")) throw error;
      logPipelineFailure(stage, input.requestId, error);
      const normalized =
        error instanceof AppError
          ? error
          : new AppError("INTERNAL_ERROR", "The evaluation could not be completed because an internal dependency failed.", 500, error);
      try {
        await this.evaluations.fail(claim.record.id, emptyUsage, normalized.code.toLowerCase());
      } catch (persistenceError) {
        logPipelineFailure("failure_persistence", input.requestId, persistenceError);
      }
      throw normalized;
    }
  }
}
