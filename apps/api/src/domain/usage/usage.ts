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

export type AdminUserUsage = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastEvaluationAt: string | null;
  evaluations: { today: number; week: number; month: number; total: number };
  successfulEvaluations: number;
  failedEvaluations: number;
  totalTokens: number;
  blockedUntil: string | null;
  permanentlyBlocked: boolean;
  blockReason: string | null;
};

export type AdminDashboard = {
  reportTimeZone: string;
  summaries: UsageSummary[];
  breakdown: UsageBreakdown[];
  users: AdminUserUsage[];
  userPage: { page: number; pageSize: number; total: number };
};
