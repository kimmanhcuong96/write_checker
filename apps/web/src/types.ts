export type Locale = "en" | "vi" | "zh" | "ja";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type User = {
  id: string; email: string | null; displayName: string | null; avatarUrl: string | null; isAdmin: boolean;
  blockedUntil: string | null; permanentlyBlocked: boolean; isBlocked: boolean;
};

export type Evaluation = {
  level: CefrLevel;
  levelReason: string;
  scores: Record<"grammar" | "vocabulary" | "sentenceComplexity" | "coherence" | "cohesion" | "communicativeEffectiveness" | "naturalness", number>;
  strengths: string[];
  problems: string[];
  corrections: { original: string; better: string; explanation: string }[];
  improvementPlan: string[];
  targetAssessment: null | {
    targetLevel: CefrLevel; meetsTarget: boolean; verdict: string; gapSummary: string[];
    sentenceUpgrades: Array<{ original: string; assessment: string; alternatives: string[] }>;
    vocabularyUpgrades: Array<{ original: string; alternatives: string[]; reason: string }>;
  };
};

export type EvaluationResponse = { id: string; status: "processing" | "completed" | "failed"; evaluation: Evaluation | null };
export type PracticeTask = { id: string; questionNumber: number; taskType: string; prompt: string; wordMinimum?: number; recommendedSeconds?: number; visualDescription?: string; visualAsset?: string; providedWords?: [string, string] };
export type IeltsCriteria = { taskAchievement: number; coherenceCohesion: number; lexicalResource: number; grammaticalRangeAccuracy: number; feedback: string[] };
export type IeltsEvaluation = { kind: "IELTS"; overallBand: number; task1Band: number; task2Band: number; task1Criteria: IeltsCriteria; task2Criteria: IeltsCriteria; strengths: string[]; weaknesses: string[]; improvementSuggestions: string[] };
export type ToeicEvaluation = { kind: "TOEIC"; estimatedScore: number; questionFeedback: Array<{ questionNumber: number; feedback: string }>; strengths: string[]; weaknesses: string[]; improvementSuggestions: string[] };
export type PracticeEvaluation = Evaluation | IeltsEvaluation | ToeicEvaluation;
export type ApiError = { error: { code: string; message: string; requestId?: string } };

export type UsageDashboard = {
  summaries: Array<{ period: "today" | "week" | "month" | "year"; requests: number; successfulRequests: number; failedRequests: number; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; providerUsage: Array<{ unit: string; value: number }> }>;
  breakdown: Array<{ provider: string; model: string; requests: number; totalTokens: number | null; providerUsageValue: number | null; providerUsageUnit: string | null }>;
};

export type AdminUserUsage = {
  id: string; email: string | null; displayName: string | null; avatarUrl: string | null; createdAt: string;
  lastEvaluationAt: string | null; evaluations: { today: number; week: number; month: number; total: number };
  successfulEvaluations: number; failedEvaluations: number; totalTokens: number; blockedUntil: string | null;
  permanentlyBlocked: boolean; blockReason: string | null;
};

export type AdminDashboard = UsageDashboard & {
  reportTimeZone: string;
  users: AdminUserUsage[];
  userPage: { page: number; pageSize: number; total: number };
};
