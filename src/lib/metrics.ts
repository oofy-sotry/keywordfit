import type { TradeRow } from "@/lib/customs/parse";
import type { MarketRow } from "@/lib/kosis/parse";
import type { Yyyymm } from "@/lib/period";

export type MonthlyImport = { month: Yyyymm; usd: number; kg: number; unitPrice: number | null };
export type CountryShare = { name: string; share: number };

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** kg당 수입 단가 (USD). 중량이 없으면 계산하지 않는다. */
export function calcUnitPrice(usd: number, kg: number): number | null {
  return kg > 0 ? round(usd / kg, 2) : null;
}

/** 증감률 (%). 직전 값이 없으면 계산하지 않는다. */
export function calcYoy(current: number, previous: number): number | null {
  return previous > 0 ? round((current / previous - 1) * 100, 1) : null;
}

/**
 * 월별 수입 합계 (국가·하위 HS코드 합산).
 * 끝쪽에 행이 하나도 없는 달은 아직 공표 전으로 보고 잘라낸다. 중간의 빈 달은 0으로 둔다.
 */
export function sumImportsByMonth(rows: TradeRow[], months: Yyyymm[]): MonthlyImport[] {
  const byMonth = new Map<Yyyymm, { usd: number; kg: number; count: number }>();
  for (const month of months) byMonth.set(month, { usd: 0, kg: 0, count: 0 });
  for (const row of rows) {
    const sum = byMonth.get(row.month);
    if (!sum) continue;
    sum.usd += row.importUsd;
    sum.kg += row.importKg;
    sum.count += 1;
  }

  let last = months.length - 1;
  while (last >= 0 && byMonth.get(months[last])!.count === 0) last -= 1;

  return months.slice(0, last + 1).map((month) => {
    const { usd, kg } = byMonth.get(month)!;
    return { month, usd, kg, unitPrice: calcUnitPrice(usd, kg) };
  });
}

/** 수입액 기준 국가 점유율 (%). 상위 n개국 외에는 "기타"로 묶어 합이 100이 되게 한다. */
export function topImportShares(rows: TradeRow[], n: number): CountryShare[] {
  const byCountry = new Map<string, number>();
  for (const row of rows) {
    byCountry.set(row.countryName, (byCountry.get(row.countryName) ?? 0) + row.importUsd);
  }
  const total = [...byCountry.values()].reduce((sum, usd) => sum + usd, 0);
  if (total <= 0) return [];

  const sorted = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, n).map(([name, usd]) => ({ name, share: round((usd / total) * 100, 1) }));
  const restUsd = sorted.slice(n).reduce((sum, [, usd]) => sum + usd, 0);
  return restUsd > 0 ? [...top, { name: "기타", share: round((restUsd / total) * 100, 1) }] : top;
}

export type ImportSummary = {
  series: MonthlyImport[]; // 최근 24개월 (공표된 달 기준)
  yoy: number | null; // 최근 12개월 합 vs 직전 12개월 합
  recent12Usd: number; // 최근 12개월 수입액 합 (12개월 미만이면 있는 만큼)
  topCountries: CountryShare[]; // 최근 12개월 기준 상위 5 + 기타
  asOf: Yyyymm; // 최신 공표 월
};

const SERIES_MONTHS = 24;
const YEAR = 12;

/** 관세청 행들을 화면용 수입 요약으로 만든다. 공표된 데이터가 하나도 없으면 null. */
export function summarizeImports(rows: TradeRow[], months: Yyyymm[]): ImportSummary | null {
  const series = sumImportsByMonth(rows, months).slice(-SERIES_MONTHS);
  if (series.length === 0) return null;

  const sumUsd = (list: MonthlyImport[]) => list.reduce((sum, m) => sum + m.usd, 0);
  const recent = series.slice(-YEAR);
  const yoy = series.length >= YEAR * 2 ? calcYoy(sumUsd(recent), sumUsd(series.slice(-YEAR * 2, -YEAR))) : null;

  const recentMonths = new Set(recent.map((m) => m.month));
  const topCountries = topImportShares(
    rows.filter((row) => recentMonths.has(row.month)),
    5,
  );

  return { series, yoy, recent12Usd: sumUsd(recent), topCountries, asOf: series[series.length - 1].month };
}

export type MonthlyMarket = { month: Yyyymm; amount: number | null };

export type MarketSummary = {
  series: MonthlyMarket[]; // 최근 24개월, 단위 백만원
  latest: number | null; // 최신 월 거래액
  yoy: number | null; // 최근 12개월 합 vs 직전 12개월 합 (수입 지표와 같은 기간)
  recent12Total: number | null; // 최근 12개월 합 (빈 달이 있거나 12개월 미만이면 null)
  asOf: Yyyymm;
};

/** KOSIS 행들을 화면용 시장 요약으로 만든다. 값이 있는 달이 하나도 없으면 null. */
export function summarizeMarket(rows: MarketRow[]): MarketSummary | null {
  if (!rows.some((row) => row.amount !== null)) return null;
  const all = rows.map(({ month, amount }) => ({ month, amount }));
  const series = all.slice(-SERIES_MONTHS);

  const sumOf = (list: MonthlyMarket[]) =>
    list.every((m) => m.amount !== null) ? list.reduce((sum, m) => sum + m.amount!, 0) : null;
  // 3개월 비교는 한 분기 등락에 크게 흔들려(통신기기 3개월 +67% vs 12개월 +30%) D6에 12개월로 변경
  const recent12 = all.slice(-YEAR);
  const previous12 = all.slice(-YEAR * 2, -YEAR);
  const recent12Total = recent12.length === YEAR ? sumOf(recent12) : null;
  const previous12Total = previous12.length === YEAR ? sumOf(previous12) : null;
  const yoy = recent12Total !== null && previous12Total !== null ? calcYoy(recent12Total, previous12Total) : null;

  const last = series[series.length - 1];
  return { series, latest: last.amount, yoy, recent12Total, asOf: last.month };
}
