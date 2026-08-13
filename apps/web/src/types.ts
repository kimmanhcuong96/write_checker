export type User = { id: string; email: string | null; displayName: string | null; avatarUrl: string | null; isAdmin: boolean };

export type Evaluation = {
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  levelReason: string;
  scores: Record<"grammar" | "vocabulary" | "sentenceComplexity" | "coherence" | "cohesion" | "communicativeEffectiveness" | "naturalness", number>;
  strengths: string[];
  problems: string[];
  corrections: { original: string; better: string; explanation: string }[];
  improvementPlan: string[];
};

export type EvaluationResponse = { id: string; status: "processing" | "completed" | "failed"; evaluation: Evaluation | null };
export type ApiError = { error: { code: string; message: string; requestId?: string } };

export type UsageDashboard = {
  summaries: Array<{ period: "today" | "week" | "month" | "year"; requests: number; successfulRequests: number; failedRequests: number; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; providerUsage: Array<{ unit: string; value: number }> }>;
  breakdown: Array<{ provider: string; model: string; requests: number; totalTokens: number | null; providerUsageValue: number | null; providerUsageUnit: string | null }>;
};
