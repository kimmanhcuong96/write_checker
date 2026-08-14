import { describe, expect, it } from "vitest";
import { GENERAL_TOPICS, IELTS_TASKS, IELTS_TOPICS, TOEIC_TASKS, createIeltsTasks, randomTopic, topicsForCategory } from "../src/domain/practice/content";
import { IELTS_WRITING_LIMIT_SECONDS, TOEIC_WRITING_LIMIT_SECONDS, canEdit, isExpired, normalizeToeicScore, remainingSeconds, statusAfterTick, toeicScoreFromQuestions, weightedIeltsBand } from "../src/domain/practice/session";
import { IeltsEvaluationSchema, ToeicEvaluationSchema } from "../src/domain/practice/evaluation";

describe("practice content", () => {
  it("ships the required fixed topic pools", () => {
    expect(GENERAL_TOPICS).toHaveLength(70);
    expect(IELTS_TOPICS).toHaveLength(30);
    expect(new Set(GENERAL_TOPICS.map((topic) => topic.id)).size).toBe(70);
  });
  it("filters and randomizes only active topics in the selected category", () => {
    expect(topicsForCategory("IELTS")).toHaveLength(30);
    expect(randomTopic("GENERAL", () => 0)?.category).toBe("GENERAL");
    expect(randomTopic("IELTS", () => 0.99)?.category).toBe("IELTS");
  });
  it("models both supported IELTS variants and the eight TOEIC questions", () => {
    expect(IELTS_TASKS.ACADEMIC).toHaveLength(2);
    expect(IELTS_TASKS.GENERAL).toHaveLength(2);
    expect(TOEIC_TASKS).toHaveLength(8);
    expect(TOEIC_TASKS.slice(0, 5).every((task) => task.taskType === "TOEIC_PICTURE_SENTENCE")).toBe(true);
    expect(TOEIC_TASKS.slice(0, 5).every((task) => task.visualAsset && task.providedWords?.length === 2)).toBe(true);
    expect(createIeltsTasks("IELTS_GENERAL", () => 0)[0]?.prompt).toContain("Write a letter");
    expect(TOEIC_TASKS[7]?.taskType).toBe("TOEIC_OPINION_ESSAY");
  });
});

describe("practice timing and scoring", () => {
  it("uses one authoritative countdown and locks only after expiry", () => {
    expect(remainingSeconds(1_000, 60, 31_000)).toBe(30);
    expect(statusAfterTick("IN_PROGRESS", 1_000, 60, 61_001)).toBe("TIME_EXPIRED");
    expect(canEdit("TIME_EXPIRED")).toBe(false);
    expect(isExpired(1_000, null, 999_999)).toBe(false);
    expect(IELTS_WRITING_LIMIT_SECONDS).toBe(3600);
    expect(TOEIC_WRITING_LIMIT_SECONDS).toBe(3600);
  });
  it("weights IELTS task 2 and maps TOEIC answers to the 0-200 scale", () => {
    expect(weightedIeltsBand(6, 7)).toBe(6.5);
    expect(toeicScoreFromQuestions([25, 25, 25, 25, 25, 25, 25, 25])).toBe(200);
    expect(toeicScoreFromQuestions([40, 40, 40, 40, 40, 40, 40, 40])).toBe(200);
    expect(normalizeToeicScore(164)).toBe(160);
    expect(normalizeToeicScore(166)).toBe(170);
  });
});

describe("practice result contracts", () => {
  it("requires estimated IELTS criteria and TOEIC question feedback", () => {
    expect(IeltsEvaluationSchema.safeParse({ kind: "IELTS", task1Band: 6, task2Band: 7, overallBand: 6.5, task1Criteria: { taskAchievement: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRangeAccuracy: 6, feedback: ["Clear overview"] }, task2Criteria: { taskAchievement: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRangeAccuracy: 7, feedback: ["Well supported"] }, strengths: ["Good structure"], weaknesses: ["Limited precision"], improvementSuggestions: ["Use more specific examples"] }).success).toBe(true);
    const questionFeedback = Array.from({ length: 8 }, (_, index) => ({ questionNumber: index + 1, feedback: `Feedback ${index + 1}` }));
    expect(ToeicEvaluationSchema.safeParse({ kind: "TOEIC", estimatedScore: 160, questionFeedback, strengths: ["Relevant response"], weaknesses: ["Grammar errors"], improvementSuggestions: ["Proofread verb forms"] }).success).toBe(true);
    expect(ToeicEvaluationSchema.safeParse({ kind: "TOEIC", estimatedScore: 160, questionFeedback: questionFeedback.slice(1), strengths: ["Relevant response"], weaknesses: ["Grammar errors"], improvementSuggestions: ["Proofread verb forms"] }).success).toBe(false);
  });
});
