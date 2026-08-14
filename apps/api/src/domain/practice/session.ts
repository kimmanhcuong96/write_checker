export type PracticeStatus = "READY" | "IN_PROGRESS" | "TIME_EXPIRED" | "SUBMITTED";
export const remainingSeconds = (startedAtMs: number, limitSeconds: number | null, nowMs = Date.now()) => limitSeconds === null ? null : Math.max(0, limitSeconds - Math.floor((nowMs - startedAtMs) / 1000));
export const isExpired = (startedAtMs: number, limitSeconds: number | null, nowMs = Date.now()) => remainingSeconds(startedAtMs, limitSeconds, nowMs) === 0 && limitSeconds !== null;
export const statusAfterTick = (status: PracticeStatus, startedAtMs: number, limitSeconds: number | null, nowMs = Date.now()): PracticeStatus => status === "IN_PROGRESS" && isExpired(startedAtMs, limitSeconds, nowMs) ? "TIME_EXPIRED" : status;
export const canEdit = (status: PracticeStatus) => status === "READY" || status === "IN_PROGRESS";
export const canFinalize = (status: PracticeStatus) => status === "IN_PROGRESS" || status === "TIME_EXPIRED";

export const IELTS_WRITING_LIMIT_SECONDS = 60 * 60;
export const TOEIC_WRITING_LIMIT_SECONDS = 60 * 60;

export const normalizeIeltsBand = (band: number) => Math.round(Math.max(0, Math.min(9, band)) * 2) / 2;
export const weightedIeltsBand = (task1: number, task2: number) => normalizeIeltsBand((normalizeIeltsBand(task1) + normalizeIeltsBand(task2) * 2) / 3);
export const normalizeToeicScore = (score: number) => Math.round(Math.max(0, Math.min(200, score)) / 10) * 10;
export const toeicScoreFromQuestions = (scores: readonly number[]) => normalizeToeicScore(scores.reduce((sum, score) => sum + score, 0));
