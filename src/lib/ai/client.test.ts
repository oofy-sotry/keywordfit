import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { UpstreamError } from "@/lib/errors";
import { createJsonGenerator, type GenerateFn } from "./client";

const Schema = z.object({ answer: z.string() });
const request = { system: "s", user: "u", schema: Schema };

function apiError(status: number, message = "") {
  return Object.assign(new Error(message), { status });
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof UpstreamError ? error.code : "NOT_UPSTREAM";
  }
  return "NO_THROW";
}

describe("createJsonGenerator", () => {
  it("기본 모델 응답을 스키마로 검증해 돌려준다", async () => {
    const generate: GenerateFn = vi.fn().mockResolvedValue({ text: '{"answer":"ok"}', finishReason: "STOP" });
    const result = await createJsonGenerator(generate, ["lite", "flash"])(request);
    expect(result).toEqual({ data: { answer: "ok" }, model: "lite" });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("503·타임아웃·429면 대체 모델로 다시 시도한다", async () => {
    for (const failure of [apiError(503), Object.assign(new Error("aborted"), { name: "TimeoutError" }), apiError(429)]) {
      const generate: GenerateFn = vi
        .fn()
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce({ text: '{"answer":"fallback"}', finishReason: "STOP" });
      const result = await createJsonGenerator(generate, ["lite", "flash"])(request);
      expect(result.model).toBe("flash");
    }
  });

  it("키 오류(401·403, 400 API key)는 대체 모델 없이 UPSTREAM_AUTH", async () => {
    for (const failure of [apiError(401), apiError(403), apiError(400, "API key not valid")]) {
      const generate: GenerateFn = vi.fn().mockRejectedValue(failure);
      expect(await codeOf(createJsonGenerator(generate, ["lite", "flash"])(request))).toBe("UPSTREAM_AUTH");
      expect(generate).toHaveBeenCalledTimes(1);
    }
  });

  it("모든 모델이 429면 UPSTREAM_RATE_LIMIT, 그 외 실패는 UPSTREAM_ERROR", async () => {
    expect(await codeOf(createJsonGenerator(vi.fn().mockRejectedValue(apiError(429)), ["a", "b"])(request))).toBe(
      "UPSTREAM_RATE_LIMIT",
    );
    expect(await codeOf(createJsonGenerator(vi.fn().mockRejectedValue(apiError(503)), ["a", "b"])(request))).toBe(
      "UPSTREAM_ERROR",
    );
  });

  it("잘린 응답(MAX_TOKENS)·안전 차단·빈 응답·스키마 불일치는 UPSTREAM_ERROR", async () => {
    const cases = [
      { text: '{"answer":', finishReason: "MAX_TOKENS" },
      { text: undefined, finishReason: "SAFETY" },
      { text: "", finishReason: "STOP" },
      { text: '{"wrong":1}', finishReason: "STOP" },
      { text: "not json", finishReason: "STOP" },
    ];
    for (const response of cases) {
      const generate: GenerateFn = vi.fn().mockResolvedValue(response);
      expect(await codeOf(createJsonGenerator(generate, ["only"])(request))).toBe("UPSTREAM_ERROR");
    }
  });
});
