import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";

const getOrFetch = vi.fn(async (_key: string, _source: string, _ttl: number, fetcher: () => Promise<unknown>) => ({
  data: await fetcher(),
  cached: false,
}));
vi.mock("@/lib/supabase", () => ({ getOrFetch }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ GEMINI_MODEL: "lite" }) }));
vi.mock("./client", () => ({ generateJson: vi.fn() }));
vi.mock("./quota", () => ({ reserveAiCall: vi.fn() }));
vi.mock("@/lib/hs/hsIndex", () => ({
  hsIndex: {
    describe6: (code: string) => (code === "851830" ? { code, label: "헤드폰과 이어폰", heading: "8518" } : null),
    search: vi.fn(() => [{ code: "851830", label: "헤드폰과 이어폰", heading: "8518" }]),
  },
}));

const { generateJson } = await import("./client");
const { reserveAiCall } = await import("./quota");
const { classifyProduct } = await import("./classify");

beforeEach(() => {
  getOrFetch.mockClear();
  vi.mocked(generateJson).mockReset();
  vi.mocked(reserveAiCall).mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("classifyProduct", () => {
  it("AI 결과를 검증해 캐시 경유로 돌려준다 (키에 프롬프트 버전·모델·정규화한 상품명)", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      data: { categoryCode: "0021", hsCandidates: [{ code: "851830", reason: "이어폰" }] },
      model: "lite",
    });
    const { data } = await classifyProduct("  무선   이어폰 ");
    expect(data).toMatchObject({ source: "ai", category: { code: "0021" }, hsCandidates: [{ code: "851830" }] });
    expect(getOrFetch.mock.calls[0][0]).toMatch(/^ai-classify:classify-v\d+:lite:무선 이어폰$/);
    expect(reserveAiCall).toHaveBeenCalledTimes(1);
  });

  it("AI 장애면 품명 검색으로 대체, 캐시하지 않음(cached=false, 상품군 null)", async () => {
    vi.mocked(generateJson).mockRejectedValue(new UpstreamError("UPSTREAM_ERROR", "503"));
    const result = await classifyProduct("무선 이어폰");
    expect(result).toMatchObject({ cached: false, data: { source: "search", category: null } });
    expect(result.data.hsCandidates.map((c) => c.reason)).toEqual(["품명 검색 결과"]);
    expect(result.data.warnings[0]).toContain("AI 분류에 실패");
  });

  it("AI 후보가 검증에서 모두 탈락하면 대체", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      data: { categoryCode: "0021", hsCandidates: [{ code: "999999", reason: "환각" }] },
      model: "lite",
    });
    expect((await classifyProduct("무선 이어폰")).data.source).toBe("search");
  });

  it("일일 한도면 AI를 부르지 않고 대체, 한도 안내 문구", async () => {
    vi.mocked(reserveAiCall).mockRejectedValue(new UpstreamError("AI_LIMIT", "limit"));
    const { data } = await classifyProduct("무선 이어폰");
    expect(generateJson).not.toHaveBeenCalled();
    expect(data.warnings[0]).toContain("한도");
  });
});
