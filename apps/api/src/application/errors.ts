export type ErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "WRITING_TOO_LONG"
  | "RATE_LIMITED"
  | "USER_BLOCKED"
  | "EVALUATION_IN_PROGRESS"
  | "DUPLICATE_REQUEST"
  | "AI_QUOTA_UNAVAILABLE"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PROVIDER_OUTPUT"
  | "EVALUATION_FAILED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
