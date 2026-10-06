import { afterEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { toSection } from "./section";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toSection", () => {
  it("성공하면 data와 cached를 담는다", async () => {
    expect(await toSection("t", async () => ({ data: 1, cached: true }))).toEqual({ ok: true, data: 1, cached: true });
  });

  it("UpstreamError는 그 코드로", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const section = await toSection("t", () => Promise.reject(new UpstreamError("UPSTREAM_AUTH", "키 오류")));
    expect(section).toEqual({ ok: false, error: "UPSTREAM_AUTH" });
  });

  it("알 수 없는 예외는 UPSTREAM_ERROR, 원인은 클라이언트로 보내지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const section = await toSection("t", () => Promise.reject(new Error("secret detail")));
    expect(section).toEqual({ ok: false, error: "UPSTREAM_ERROR" });
    expect(JSON.stringify(section)).not.toContain("secret detail");
  });

  it("NO_DATA는 정상 상황이라 에러 로그를 남기지 않는다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await toSection("t", () => Promise.reject(new UpstreamError("NO_DATA", "없음")));
    expect(log).not.toHaveBeenCalled();
  });
});
