import { describe, expect, it } from "vitest";
import { clientKey } from "./clientKey";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientKey", () => {
  it("x-forwarded-for의 첫 IP를 해시한다 (IP 원문은 남기지 않음)", () => {
    const key = clientKey(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(key).not.toContain("203");
    expect(key).toBe(clientKey(headers({ "x-forwarded-for": "203.0.113.7" })));
  });

  it("x-forwarded-for가 없으면 x-real-ip", () => {
    expect(clientKey(headers({ "x-real-ip": "203.0.113.7" }))).toBe(clientKey(headers({ "x-forwarded-for": "203.0.113.7" })));
  });

  it("IP가 다르면 키도 다르다", () => {
    expect(clientKey(headers({ "x-real-ip": "203.0.113.7" }))).not.toBe(clientKey(headers({ "x-real-ip": "203.0.113.8" })));
  });

  it("IP 헤더가 없으면 'unknown' 한 묶음", () => {
    expect(clientKey(headers({}))).toBe("unknown");
  });
});
