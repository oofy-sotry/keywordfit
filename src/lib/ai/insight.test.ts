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
  hsIndex: { describe6: (code: string) => ({ code, label: "헤드폰과 이어폰", heading: "8518" }) },
}));
vi.mock("@/lib/kosis/market", () => ({
  getMarketSummary: vi.fn(async () => ({
    data: { series: [], latest: 1_337_360, yoy: 8.1, recent12Total: 1, asOf: "202608" },
    cached: true,
  })),
}));
vi.mock("@/lib/customs/imports", () => ({
  getImportSummary: vi.fn(async () => ({
    data: {
      series: [{ month: "202608", usd: 1, kg: 1, unitPrice: 80.52 }],
      yoy: 23,
      recent12Usd: 630_765_586,
      topCountries: [{ name: "중국", share: 51.9 }],
      asOf: "202607",
    },
    cached: true,
  })),
}));

const { generateJson } = await import("./client");
const { reserveAiCall } = await import("./quota");
const { getImportSummary } = await import("@/lib/customs/imports");
const { getInsight } = await import("./insight");

beforeEach(() => {
  getOrFetch.mockClear();
  vi.mocked(generateJson).mockReset();
  vi.mocked(reserveAiCall).mockReset().mockResolvedValue();
});

describe("getInsight", () => {
  it("서버에서 다시 조회한 우리 데이터로 자리표시자를 채운다", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      data: { points: [{ text: "시장은 {{marketYoy}}, 수입은 {{importYoy}} 늘었어요.", metrics: [] }] },
      model: "lite",
    });
    const { data } = await getInsight("0021", "851830");
    expect(data.points).toEqual([{ text: "시장은 +8.1%, 수입은 +23.0% 늘었어요.", metrics: ["marketYoy", "importYoy"] }]);
    expect(data.opportunity?.grade).toBe("growing");
    expect(data.metrics.topCountry).toBe("중국");
  });

  it("캐시 키에 프롬프트 버전·모델·상품군·HS·데이터 기준월이 들어간다 (새 달 데이터면 새로 생성)", async () => {
    vi.mocked(generateJson).mockResolvedValue({ data: { points: [{ text: "{{topCountry}} 비중이 커요.", metrics: [] }] }, model: "lite" });
    await getInsight("0021", "851830");
    expect(getOrFetch.mock.calls[0][0]).toMatch(/^ai-insight:insight-v\d+:lite:0021:851830:202608:202607$/);
  });

  it("검증 후 남은 코멘트가 없으면 UPSTREAM_ERROR (캐시하지 않음)", async () => {
    vi.mocked(generateJson).mockResolvedValue({ data: { points: [{ text: "약 30% 성장", metrics: [] }] }, model: "lite" });
    await expect(getInsight("0021", "851830")).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });

  it("일일 한도면 AI를 부르지 않고 AI_LIMIT", async () => {
    vi.mocked(reserveAiCall).mockRejectedValue(new UpstreamError("AI_LIMIT", "limit"));
    await expect(getInsight("0021", "851830")).rejects.toMatchObject({ code: "AI_LIMIT" });
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("데이터 조회가 실패하면 그 오류 그대로", async () => {
    vi.mocked(getImportSummary).mockRejectedValueOnce(new UpstreamError("NO_DATA", "없음"));
    await expect(getInsight("0021", "851830")).rejects.toMatchObject({ code: "NO_DATA" });
  });
});
