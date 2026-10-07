import { SourceNote } from "@/components/ui";
import { formatSignedPercent } from "@/lib/format";
import {
  IMPORT_GROWTH_THRESHOLD,
  MARKET_GROWTH_THRESHOLD,
  type Opportunity,
  type OpportunityGrade,
} from "@/lib/opportunity";
import { SOURCES } from "@/lib/sources";

/** 상태 색은 막대 표시에만, 의미는 아이콘 + 글자로 (색만으로 전달하지 않음) */
const STYLE: Record<OpportunityGrade, { icon: string; bar: string }> = {
  opportunity: { icon: "✓", bar: "bg-status-good" },
  growing: { icon: "↗", bar: "bg-status-warning" },
  overheated: { icon: "!", bar: "bg-status-serious" },
  shrinking: { icon: "↘", bar: "bg-muted" },
};

/** F4 진입 판단 (시장 성장률 × 수입 증가율 4분면) */
export function OpportunityBadge({ opportunity }: { opportunity: Opportunity }) {
  const style = STYLE[opportunity.grade];
  return (
    <section aria-label="진입 판단" className="flex overflow-hidden rounded-xl border border-border bg-surface">
      <div className={`w-2 shrink-0 ${style.bar}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <p className="text-xs text-muted">진입 판단</p>
        <p className="text-xl font-semibold">
          <span aria-hidden className="mr-2 inline-block w-5 text-center">
            {style.icon}
          </span>
          {opportunity.label}
        </p>
        <p className="text-sm text-secondary">{opportunity.description}</p>
        <p className="mt-1 text-xs text-muted">
          시장 성장률 {formatSignedPercent(opportunity.marketYoy)} (기준 {MARKET_GROWTH_THRESHOLD}% 이상이면 성장) · 수입
          증가율 {formatSignedPercent(opportunity.importYoy)} (기준 {IMPORT_GROWTH_THRESHOLD}% 이상이면 증가) — 둘 다 최근
          12개월 전년 대비, 시장은 상품군 전체·수입은 해당 품목 기준
        </p>
        <div className="mt-1">
          <SourceNote sources={[SOURCES.kosis, SOURCES.customs]} note="KeywordFit 기준으로 계산" />
        </div>
      </div>
    </section>
  );
}
