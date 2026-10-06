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
      {result.opportunity?.ok && <OpportunityBadge opportunity={result.opportunity.data} />}
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
