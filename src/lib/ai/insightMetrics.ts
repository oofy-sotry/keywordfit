import { formatKrwMillion, formatSignedPercent, formatUsd } from "@/lib/format";
import type { ImportSummary, MarketSummary } from "@/lib/metrics";
import type { Opportunity } from "@/lib/opportunity";

/** AI 코멘트가 {{key}}로 참조할 수 있는 지표. 값은 항상 우리 데이터에서 만든다. */
export const METRIC_KEYS = [
  "marketYoy",
  "marketLatest",
  "importYoy",
  "importRecent12",
  "topCountry",
  "topCountryShare",
  "unitPrice",
  "opportunity",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];
export type InsightMetrics = Record<MetricKey, string | null>;

/** 화면 칩·프롬프트 설명용 이름 */
export const METRIC_LABELS: Record<MetricKey, string> = {
  marketYoy: "시장 성장률(최근 3개월, 전년 대비)",
  marketLatest: "최근 월 온라인 거래액",
  importYoy: "수입 증가율(최근 12개월, 전년 대비)",
  importRecent12: "최근 12개월 수입액",
  topCountry: "1위 수입국",
  topCountryShare: "1위 수입국 점유율",
  unitPrice: "최근 월 kg당 수입 단가",
  opportunity: "진입 판단 등급",
};

export function isMetricKey(key: string): key is MetricKey {
  return (METRIC_KEYS as readonly string[]).includes(key);
}

export function buildInsightMetrics(
  market: MarketSummary,
  imports: ImportSummary,
  opportunity: Opportunity | null,
): InsightMetrics {
  const top = imports.topCountries.find((country) => country.name !== "기타");
  const unitPrice = imports.series[imports.series.length - 1]?.unitPrice ?? null;
  return {
    marketYoy: market.yoy === null ? null : formatSignedPercent(market.yoy),
    marketLatest: market.latest === null ? null : formatKrwMillion(market.latest),
    importYoy: imports.yoy === null ? null : formatSignedPercent(imports.yoy),
    importRecent12: formatUsd(imports.recent12Usd),
    topCountry: top?.name ?? null,
    topCountryShare: top ? `${top.share.toFixed(1)}%` : null,
    unitPrice: unitPrice === null ? null : `$${unitPrice.toFixed(2)}/kg`,
    opportunity: opportunity?.label ?? null,
  };
}
