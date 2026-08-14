import { describe, expect, it, vi } from "vitest";
import { CloudflareWorkersAIProvider } from "../src/infrastructure/llm/cloudflare-workers-ai/provider";
import { z } from "zod";

const evaluation = {
  level: "B1",
  levelReason: "The text communicates connected ideas with reasonable control.",
  scores: {
    grammar: 6,
    vocabulary: 6,
    sentenceComplexity: 5,
    coherence: 6,
    cohesion: 5,
    communicativeEffectiveness: 6,
    naturalness: 5
  },
  strengths: ["The main message is clear."],
  problems: ["Sentence patterns are repetitive."],
  corrections: [],
  improvementPlan: ["Vary sentence openings."],
  targetAssessment: null
};

const writingInput = { text: "This is my writing.", wordCount: 4, mode: "estimate" as const, targetLevel: null, feedbackLanguage: "en" as const };

describe("CloudflareWorkersAIProvider REST adapter", () => {
  it("calls Workers AI in another account with a bearer token", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          success: true,
          result: {
            response: JSON.stringify(evaluation),
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
          },
          errors: [],
          messages: []
        })
      )
    );
    const provider = new CloudflareWorkersAIProvider(
      "account-b",
      "secret-token",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      fetcher
    );

    const result = await provider.evaluateWriting(writingInput);

    expect(result.result).toEqual(evaluation);
    expect(result.usage.totalTokens).toBe(30);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.instances[0]).toBeUndefined();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-b/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json"
    });
    expect(typeof init?.body).toBe("string");
    expect(JSON.parse(typeof init?.body === "string" ? init.body : "null")).toMatchObject({
      max_tokens: 1400,
      response_format: { type: "json_schema" }
    });
  });

  it("maps Cloudflare rate limits to the controlled quota error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json(
          { success: false, result: null, errors: [{ code: 7505, message: "Rate limited" }], messages: [] },
          { status: 429 }
        )
      )
    );
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);

    await expect(provider.evaluateWriting(writingInput)).rejects.toMatchObject({
      code: "AI_QUOTA_UNAVAILABLE",
      status: 503
    });
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({
        event: "workers_ai_request_failed",
        reason: "http_error",
        httpStatus: 429,
        cfRay: null,
        errors: [{ code: 7505, message: "Rate limited" }]
      })
    );
    consoleError.mockRestore();
  });

  it("logs safe Cloudflare diagnostics for account or token failures", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json(
          { success: false, result: null, errors: [{ code: 10000, message: "Authentication error" }], messages: [] },
          { status: 403, headers: { "cf-ray": "safe-ray-id" } }
        )
      )
    );
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);

    await expect(provider.evaluateWriting(writingInput)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      status: 503
    });
    const log = String(consoleError.mock.calls[0]?.[0]);
    expect(JSON.parse(log)).toEqual({
      event: "workers_ai_request_failed",
      reason: "http_error",
      httpStatus: 403,
      cfRay: "safe-ray-id",
      errors: [{ code: 10000, message: "Authentication error" }]
    });
    expect(log).not.toContain("secret-token");
    expect(log).not.toContain("account-b");
    consoleError.mockRestore();
  });

  it("classifies a fetch TypeError without logging credentials", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Invalid character in header value")));
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);

    await expect(provider.evaluateWriting(writingInput)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      status: 503
    });
    const log = String(consoleError.mock.calls[0]?.[0]);
    expect(JSON.parse(log)).toEqual({
      event: "workers_ai_request_failed",
      reason: "network_error",
      errorType: "TypeError",
      networkErrorKind: "invalid_header"
    });
    expect(log).not.toContain("secret-token");
    expect(log).not.toContain("account-b");
    consoleError.mockRestore();
  });

  it("rejects a malformed successful Cloudflare response", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ success: true, result: { response: "not json" }, errors: [], messages: [] }))
    );
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);

    await expect(provider.evaluateWriting(writingInput)).rejects.toMatchObject({
      code: "INVALID_PROVIDER_OUTPUT",
      status: 502
    });
  });

  it("rejects a response that does not match the requested evaluation mode", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({
      success: true,
      result: { response: JSON.stringify(evaluation) },
      errors: [],
      messages: []
    })));
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);

    await expect(provider.evaluateWriting({ ...writingInput, mode: "targeted", targetLevel: "B2" })).rejects.toMatchObject({
      code: "INVALID_PROVIDER_OUTPUT",
      status: 502
    });
  });

  it("passes complete IELTS task context and enforces task-two weighting", async () => {
    const ieltsResult = {
      kind: "IELTS", task1Band: 6, task2Band: 7, overallBand: 9,
      task1Criteria: { taskAchievement: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRangeAccuracy: 6, feedback: ["Clear overview"] },
      task2Criteria: { taskAchievement: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRangeAccuracy: 7, feedback: ["Supported position"] },
      strengths: ["Clear organization"], weaknesses: ["Some imprecision"], improvementSuggestions: ["Use more exact comparisons"]
    };
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ success: true, result: { response: JSON.stringify(ieltsResult) }, errors: [] })));
    const provider = new CloudflareWorkersAIProvider("account-b", "secret-token", "@cf/meta/model", fetcher);
    const response = await provider.evaluateWriting({ ...writingInput, text: "Question 1:\nAnswer one\n\nQuestion 2:\nAnswer two", context: { mode: "IELTS", examType: "IELTS", examVariant: "IELTS_ACADEMIC", tasks: [{ questionNumber: 1, taskType: "IELTS_ACADEMIC_TASK_1", prompt: "Describe the chart.", visualDescription: "Values are 10 and 20.", wordMinimum: 150 }, { questionNumber: 2, taskType: "IELTS_TASK_2", prompt: "Discuss both views.", wordMinimum: 250 }] } });
    expect(response.result).toMatchObject({ kind: "IELTS", overallBand: 6.5 });
    const requestBody = fetcher.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe("string");
    const parsedBody: unknown = JSON.parse(typeof requestBody === "string" ? requestBody : "null");
    const body = z.object({ max_tokens: z.number(), messages: z.array(z.object({ content: z.string() })) }).parse(parsedBody);
    expect(body.max_tokens).toBe(2400);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1]?.content).toContain("Describe the chart.");
    expect(body.messages[1]?.content).toContain("Values are 10 and 20.");
  });
});
