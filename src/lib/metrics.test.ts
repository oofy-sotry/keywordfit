import { describe, expect, it } from "vitest";
import type { TradeRow } from "@/lib/customs/parse";
import type { MarketRow } from "@/lib/kosis/parse";
import { listMonths } from "@/lib/period";
import {
  calcUnitPrice,
  calcYoy,
  sumImportsByMonth,
  summarizeImports,
  summarizeMarket,
  topImportShares,
} from "./metrics";

function row(month: string, countryName: string, importUsd: number, importKg: number): TradeRow {
  return {
    month,
    hsCode: "8518309000",
    countryCode: countryName.slice(0, 2),
    countryName,
    importUsd,
    importKg,
    exportUsd: 0,
    exportKg: 0,
  };
}

describe("calcUnitPrice", () => {
  it("kg당 달러 단가를 소수 2자리로", () => {
    expect(calcUnitPrice(1000, 3)).toBe(333.33);
  });

  it("중량이 0 이하면 null", () => {
    expect(calcUnitPrice(1000, 0)).toBeNull();
  });
});

describe("calcYoy", () => {
  it("증감률을 % 소수 1자리로", () => {
    expect(calcYoy(123, 100)).toBe(23);
    expect(calcYoy(90, 120)).toBe(-25);
    expect(calcYoy(1001, 1000)).toBe(0.1);
  });

  it("직전 값이 0 이하면 null", () => {
    expect(calcYoy(100, 0)).toBeNull();
  });
});

describe("sumImportsByMonth", () => {
  const rows = [
    row("202606", "중국", 100, 10),
    row("202606", "베트남", 50, 5),
    row("202608", "중국", 30, 0),
  ];

  it("월별로 국가·하위 코드를 합산하고 단가를 계산한다", () => {
    expect(sumImportsByMonth(rows, ["202606", "202607", "202608"])).toEqual([
      { month: "202606", usd: 150, kg: 15, unitPrice: 10 },
      { month: "202607", usd: 0, kg: 0, unitPrice: null },
      { month: "202608", usd: 30, kg: 0, unitPrice: null },
    ]);
  });

  it("끝쪽에 데이터가 전혀 없는 달은 미공표로 보고 잘라낸다", () => {
    const result = sumImportsByMonth(rows, ["202606", "202607", "202608", "202609", "202610"]);
    expect(result.map((r) => r.month)).toEqual(["202606", "202607", "202608"]);
  });
});

describe("topImportShares", () => {
  const rows = [
    row("202607", "중국", 600, 1),
    row("202608", "중국", 200, 1),
    row("202608", "베트남", 100, 1),
    row("202608", "미국", 60, 1),
    row("202608", "일본", 40, 1),
  ];

  it("수입액 기준 상위 n개국 점유율(%)을 내림차순으로, 나머지는 기타로 묶는다", () => {
    expect(topImportShares(rows, 2)).toEqual([
      { name: "중국", share: 80 },
      { name: "베트남", share: 10 },
      { name: "기타", share: 10 },
    ]);
  });

  it("국가 수가 n 이하면 기타 없이 합이 100", () => {
    const shares = topImportShares(rows, 5);
    expect(shares.map((s) => s.name)).not.toContain("기타");
    expect(shares.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100);
  });

  it("수입액 합이 0이면 빈 배열", () => {
    expect(topImportShares([row("202608", "중국", 0, 0)], 5)).toEqual([]);
  });
});

describe("summarizeImports", () => {
  // 202408~202609 요청 (26개월). 202609는 미공표라 행 없음 → 202408~202608 = 25개월
  const months = listMonths("202408", "202609");
  const rows = listMonths("202408", "202608").flatMap((month) => [
    row(month, "중국", month >= "202509" ? 120 : 100, 10),
    row(month, "베트남", 20, 2),
  ]);

  it("미공표 달을 잘라내고 최근 24개월만 남긴다", () => {
    const summary = summarizeImports(rows, months)!;
    expect(summary.series).toHaveLength(24);
    expect(summary.series[0].month).toBe("202409");
    expect(summary.asOf).toBe("202608");
  });

  it("최근 12개월 합 vs 직전 12개월 합으로 증감률을 낸다", () => {
    // 최근 12개월 140×12, 직전 12개월 120×12 → +16.7%
    expect(summarizeImports(rows, months)!.yoy).toBe(16.7);
  });

  it("최근 12개월 수입액 합계", () => {
    expect(summarizeImports(rows, months)!.recent12Usd).toBe(140 * 12);
  });

  it("수입국 점유율은 최근 12개월 기준", () => {
    expect(summarizeImports(rows, months)!.topCountries).toEqual([
      { name: "중국", share: 85.7 },
      { name: "베트남", share: 14.3 },
    ]);
  });

  it("24개월이 안 되면 증감률은 null", () => {
    const short = summarizeImports(rows, listMonths("202601", "202609"))!;
    expect(short.series).toHaveLength(8);
    expect(short.yoy).toBeNull();
  });

  it("행이 하나도 없으면 null", () => {
    expect(summarizeImports([], months)).toBeNull();
  });

  it("수입액이 전부 0이면 null — 특수용도 코드(9999999290: $0, 73kg)처럼 의미 없는 데이터", () => {
    expect(summarizeImports([row("202603", "헝가리", 0, 73)], listMonths("202601", "202603"))).toBeNull();
  });
});

describe("summarizeMarket", () => {
  const market = (month: string, amount: number | null): MarketRow => ({
    month,
    categoryCode: "0021",
    categoryName: "가전·전자",
    amount,
  });
  // 202409~202608 (24개월). 직전 12개월(202409~202508) 100씩, 최근 12개월(202509~202608) 110씩
  const rows = listMonths("202409", "202608").map((month) => market(month, month >= "202509" ? 110 : 100));

  it("최근 24개월 시계열과 최신 값·기준월", () => {
    const summary = summarizeMarket(rows)!;
    expect(summary.series).toHaveLength(24);
    expect(summary.series[0]).toEqual({ month: "202409", amount: 100 });
    expect(summary.latest).toBe(110);
    expect(summary.asOf).toBe("202608");
  });

  it("최근 12개월 합 vs 직전 12개월 합 증감률 (수입 지표와 같은 기간 — D6에 3개월에서 변경)", () => {
    expect(summarizeMarket(rows)!.yoy).toBe(10);
  });

  it("최근 12개월 거래액 합계", () => {
    expect(summarizeMarket(rows)!.recent12Total).toBe(110 * 12);
  });

  it("최근 12개월에 빈 값이 있거나 12개월 미만이면 합계 null", () => {
    const withGap = rows.map((r) => (r.month === "202601" ? market(r.month, null) : r));
    expect(summarizeMarket(withGap)!.recent12Total).toBeNull();
    expect(summarizeMarket(rows.slice(-11))!.recent12Total).toBeNull();
  });

  it("비교 구간(직전 12개월)에 빈 값이 있으면 증감률 null", () => {
    const withGap = rows.map((r) => (r.month === "202412" ? market(r.month, null) : r));
    expect(summarizeMarket(withGap)!.yoy).toBeNull();
  });

  it("24개월 미만이면 증감률 null", () => {
    expect(summarizeMarket(rows.slice(-23))!.yoy).toBeNull();
  });

  it("값이 있는 행이 없으면 null", () => {
    expect(summarizeMarket([])).toBeNull();
    expect(summarizeMarket([market("202608", null)])).toBeNull();
  });
});
