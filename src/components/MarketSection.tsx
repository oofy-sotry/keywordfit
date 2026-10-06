import { MarketChart } from "@/components/MarketChart";
import { Card, SectionBlock } from "@/components/ui";
import { formatKrwMillion, formatMonth, formatSignedPercent } from "@/lib/format";
import { categoryName, type MarketCategoryCode } from "@/lib/kosis/categories";
import type { MarketSummary } from "@/lib/metrics";

/** F2 온라인 시장 (KOSIS 온라인쇼핑동향) */
export function MarketSection({ category, summary }: { category: MarketCategoryCode; summary: MarketSummary }) {
  const name = categoryName(category);
  const recent12 = summary.series.slice(-12);
  const yearTotal = recent12.every((m) => m.amount !== null)
    ? recent12.reduce((sum, m) => sum + m.amount!, 0)
    : null;

  return (
    <SectionBlock
      title={`온라인 시장 · ${name}`}
      source={`출처: 국가데이터처(통계청) 온라인쇼핑동향조사 · 기준 ${formatMonth(summary.asOf)} · 상품군 전체 거래액 (개별 품목 아님)`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label={`월 거래액 (${formatMonth(summary.asOf)})`} value={formatKrwMillion(summary.latest)} />
        <Card label="시장 성장률 (최근 3개월, 전년 대비)" value={formatSignedPercent(summary.yoy)} />
        <Card label="최근 12개월 거래액" value={formatKrwMillion(yearTotal)} />
      </div>
      <MarketChart title={`${name} 온라인 거래액 (월)`} series={summary.series} />
    </SectionBlock>
  );
}
