import type { ImportSummary, MarketSummary } from "@/lib/metrics";
import type { Section } from "@/lib/section";

/**
 * 진입 판단 지표 (design.md §5). 시장 성장률 × 수입 증가율 4분면.
 * 임계값은 초안 — D6에 대표 품목 20개 분포를 보고 조정하고 근거를 ai-log에 남긴다.
 * 주의: 시장은 최근 3개월 전년 대비(KOSIS 상품군 전체), 수입은 최근 12개월 전년 대비(HS 품목) — 기간·범위가 다르다.
 */
export const MARKET_GROWTH_THRESHOLD = 5; // %, 이상이면 시장 성장
export const IMPORT_GROWTH_THRESHOLD = 10; // %, 이상이면 수입 증가

export type OpportunityGrade = "opportunity" | "growing" | "overheated" | "shrinking";

export type Opportunity = {
  grade: OpportunityGrade;
  label: string;
  description: string;
  marketYoy: number;
  importYoy: number;
};

const GRADES: Record<OpportunityGrade, { label: string; description: string }> = {
  opportunity: { label: "기회", description: "수요는 늘고 수입(공급) 유입은 적어요" },
  growing: { label: "성장 중·경쟁 유입", description: "수요가 늘지만 수입(공급)도 빠르게 늘고 있어요" },
  overheated: { label: "과열 주의", description: "수요는 그대로인데 수입(공급)이 늘고 있어요" },
  shrinking: { label: "축소 시장", description: "수요와 수입 모두 늘지 않고 있어요" },
};

export function classifyOpportunity(marketYoy: number | null, importYoy: number | null): Opportunity | null {
  if (marketYoy === null || importYoy === null) return null;
  const marketUp = marketYoy >= MARKET_GROWTH_THRESHOLD;
  const importUp = importYoy >= IMPORT_GROWTH_THRESHOLD;
  const grade: OpportunityGrade = marketUp ? (importUp ? "growing" : "opportunity") : importUp ? "overheated" : "shrinking";
  return { grade, ...GRADES[grade], marketYoy, importYoy };
}

/**
 * 두 섹션 결과로 진입 판단 섹션을 만든다. 한쪽이라도 요청하지 않았으면 null,
 * 실패했거나 증감률이 없으면 NO_DATA. 둘 다 캐시일 때만 cached.
 */
export function toOpportunitySection(
  market: Section<MarketSummary> | null,
  imports: Section<ImportSummary> | null,
): Section<Opportunity> | null {
  if (!market || !imports) return null;
  if (!market.ok || !imports.ok) return { ok: false, error: "NO_DATA" };
  const opportunity = classifyOpportunity(market.data.yoy, imports.data.yoy);
  if (!opportunity) return { ok: false, error: "NO_DATA" };
  return { ok: true, data: opportunity, cached: market.cached && imports.cached };
}
