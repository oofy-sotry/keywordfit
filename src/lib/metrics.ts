import type { TradeRow } from "@/lib/customs/parse";
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
