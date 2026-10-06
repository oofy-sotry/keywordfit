import { ImportSection } from "@/components/ImportSection";
import { InsightPanel } from "@/components/InsightPanel";
import { MarketSection } from "@/components/MarketSection";
import { OpportunityBadge } from "@/components/OpportunityBadge";
import { ErrorBox } from "@/components/ui";
import type { MarketCategoryCode } from "@/lib/kosis/categories";
import type { ImportSummary, MarketSummary } from "@/lib/metrics";
import type { Opportunity } from "@/lib/opportunity";
import type { Section } from "@/lib/section";

/** GET /api/analyze 성공 응답 */
export type AnalyzeResult = {
  ok: true;
  hs: string | null;
  category: MarketCategoryCode | null;
  market: Section<MarketSummary> | null;
  imports: Section<ImportSummary> | null;
  opportunity: Section<Opportunity> | null;
};

/** 분석 결과 조립: 진입 판단 → 온라인 시장 → 수입 동향 → AI 코멘트 */
export function AnalysisResults({ result }: { result: AnalyzeResult }) {
  const bothOk = result.category && result.hs && result.market?.ok && result.imports?.ok;
  return (
    <>
      {result.opportunity &&
        (result.opportunity.ok ? (
          <OpportunityBadge opportunity={result.opportunity.data} />
        ) : (
          // 실패가 아니라 "판단 불가" — 오류 색 대신 안내 상자
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-secondary">
            진입 판단을 계산할 수 없어요. 시장과 수입 모두 전년 대비 비교 데이터가 있어야 해요 (수입 실적이 짧거나 한쪽
            데이터를 불러오지 못한 경우).
          </p>
        ))}
      {result.category &&
        result.market &&
        (result.market.ok ? (
          <MarketSection category={result.category} summary={result.market.data} />
        ) : (
          <ErrorBox title="온라인 시장" code={result.market.error} />
        ))}
      {result.hs &&
        result.imports &&
        (result.imports.ok ? (
          <ImportSection hs={result.hs} summary={result.imports.data} />
        ) : (
          <ErrorBox title="수입 동향" code={result.imports.error} />
        ))}
      {bothOk && <InsightPanel key={`${result.category}:${result.hs}`} category={result.category!} hs={result.hs!} />}
    </>
  );
}
