export type LlmUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  providerUsageValue: number | null;
  providerUsageUnit: string | null;
};

export type UsagePeriod = "today" | "week" | "month" | "year";

export type UsageSummary = {
  period: UsagePeriod;
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  providerUsage: Array<{ unit: string; value: number }>;
};

export type UsageBreakdown = {
  provider: string;
  model: string;
  requests: number;
  totalTokens: number | null;
  providerUsageValue: number | null;
  providerUsageUnit: string | null;
};
