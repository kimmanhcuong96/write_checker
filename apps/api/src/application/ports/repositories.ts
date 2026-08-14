import type { AuthenticatedUser, ExternalIdentity } from "../../domain/users/user";
import type { CefrLevel, EvaluationMode, FeedbackLocale, WritingEvaluationResult } from "../../domain/cefr/evaluation";
import type { AdminDashboard, LlmUsage, UsageBreakdown, UsageSummary } from "../../domain/usage/usage";
import type { PracticeEvaluation } from "../../domain/practice/evaluation";
import type { ExamTask, PracticeTopic } from "../../domain/practice/content";

export type EvaluationStatus = "processing" | "completed" | "failed";

export type EvaluationResult = WritingEvaluationResult | PracticeEvaluation;
export type EvaluationRecord = {
  id: string;
  userId: string;
  requestId: string;
  status: EvaluationStatus;
  result: EvaluationResult | null;
};

export interface UserRepository {
  upsertExternalIdentity(identity: ExternalIdentity): Promise<AuthenticatedUser>;
}

export interface SessionRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findUserByTokenHash(tokenHash: string): Promise<AuthenticatedUser | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}

export interface EvaluationRepository {
  claim(input: {
    requestId: string;
    userId: string;
    text: string;
    wordCount: number;
    mode: EvaluationMode;
    targetLevel: CefrLevel | null;
    feedbackLanguage: FeedbackLocale;
    provider: string;
    model: string;
  }): Promise<{ record: EvaluationRecord; created: boolean } | null>;
  findById(id: string, userId: string): Promise<EvaluationRecord | null>;
  complete(id: string, result: EvaluationResult, usage: LlmUsage): Promise<void>;
  fail(id: string, usage: LlmUsage, errorType: string): Promise<void>;
  consumedTokens(): Promise<number>;
  countEvaluationsSince(userId: string, since: Date): Promise<number>;
  usageDashboard(timeZone: string): Promise<{ summaries: UsageSummary[]; breakdown: UsageBreakdown[] }>;
  adminDashboard(input: { page: number; pageSize: number; search: string; timeZone: string }): Promise<AdminDashboard>;
  setUserSuspension(input: {
    actorUserId: string;
    targetUserId: string;
    kind: "none" | "days" | "permanent";
    days: number | null;
    reason: string | null;
  }): Promise<boolean>;
}

export type PracticeSession = { id: string; userId: string; mode: "TOPIC" | "EXAM"; category: "GENERAL" | "IELTS" | null; examType: "IELTS" | "TOEIC" | null; examVariant: "IELTS_ACADEMIC" | "IELTS_GENERAL" | null; status: "READY" | "IN_PROGRESS" | "TIME_EXPIRED" | "SUBMITTED"; startedAt: string | null; submittedAt: string | null; timeLimitSeconds: number | null; elapsedSeconds: number; tasks: readonly (ExamTask | PracticeTopic)[]; answers: string[] };
export interface PracticeSessionRepository {
  createPracticeSession(input: Omit<PracticeSession, "id" | "status" | "startedAt" | "submittedAt" | "elapsedSeconds" | "answers">): Promise<PracticeSession>;
  findPracticeSession(id: string, userId: string): Promise<PracticeSession | null>;
  finalizePracticeSession(id: string, userId: string, answers: string[]): Promise<PracticeSession | null>;
}
