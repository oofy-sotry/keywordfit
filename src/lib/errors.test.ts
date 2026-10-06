import { describe, expect, it } from "vitest";
import { httpStatusOf, toErrorCode, UpstreamError } from "./errors";

describe("httpStatusOf", () => {
  it("design.md §4 표대로 HTTP 상태를 고른다", () => {
    expect(httpStatusOf("INVALID_INPUT")).toBe(400);
    expect(httpStatusOf("NO_DATA")).toBe(200);
    expect(httpStatusOf("UPSTREAM_AUTH")).toBe(502);
    expect(httpStatusOf("UPSTREAM_RATE_LIMIT")).toBe(429);
    expect(httpStatusOf("UPSTREAM_ERROR")).toBe(502);
    expect(httpStatusOf("AI_LIMIT")).toBe(429);
  });
});

describe("toErrorCode", () => {
  it("UpstreamError는 그 코드, 나머지는 UPSTREAM_ERROR", () => {
    expect(toErrorCode(new UpstreamError("AI_LIMIT", "x"))).toBe("AI_LIMIT");
    expect(toErrorCode(new Error("x"))).toBe("UPSTREAM_ERROR");
  });
});
