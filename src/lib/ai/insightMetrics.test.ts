import { describe, expect, it } from "vitest";
import type { ImportSummary, MarketSummary } from "@/lib/metrics";
import { classifyOpportunity } from "@/lib/opportunity";
import { buildInsightMetrics, METRIC_KEYS } from "./insightMetrics";

const market: MarketSummary = {
  series: [{ month: "202608", amount: 1_337_360 }],
  latest: 1_337_360,
  yoy: 5.3,
  recent12Total: 16_766_369,
  asOf: "202608",
};
const imports: ImportSummary = {
  series: [{ month: "202608", usd: 37_770_993, kg: 469_101, unitPrice: 80.52 }],
  yoy: 11.8,
  recent12Usd: 630_765_586,
  topCountries: [
    { name: "중국", share: 51.9 },
    { name: "베트남", share: 40.8 },
  ],
  asOf: "202608",
};

describe("buildInsightMetrics", () => {
  it("우리 데이터로 화면 표시용 값을 만든다", () => {
    expect(buildInsightMetrics(market, imports, classifyOpportunity(5.3, 11.8))).toEqual({
      marketYoy: "+5.3%",
      marketLatest: "1.34조원",
      importYoy: "+11.8%",
      importRecent12: "$6.3억",
      topCountry: "중국",
      topCountryShare: "51.9%",
      unitPrice: "$80.52/kg",
      opportunity: "성장 중·경쟁 유입",
    });
  });

  it("값이 없으면 null (AI가 그 지표를 쓰면 검증에서 탈락)", () => {
    const empty = buildInsightMetrics(
      { ...market, yoy: null },
      { ...imports, yoy: null, topCountries: [], series: [{ month: "202608", usd: 0, kg: 0, unitPrice: null }] },
      null,
    );
    expect(empty).toMatchObject({ marketYoy: null, importYoy: null, topCountry: null, topCountryShare: null, unitPrice: null, opportunity: null });
  });

  it("키 목록이 고정돼 있다 (프롬프트·검증 공용)", () => {
    expect(Object.keys(buildInsightMetrics(market, imports, null)).sort()).toEqual([...METRIC_KEYS].sort());
  });
});
