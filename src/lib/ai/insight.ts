import { z } from "zod";
import type { Cached } from "@/lib/cache";
import { getImportSummary } from "@/lib/customs/imports";
import { getEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { hsIndex } from "@/lib/hs/hsIndex";
import { categoryName, type MarketCategoryCode } from "@/lib/kosis/categories";
import { getMarketSummary } from "@/lib/kosis/market";
import { classifyOpportunity, type Opportunity } from "@/lib/opportunity";
import { getOrFetch } from "@/lib/supabase";
import { generateJson } from "./client";
import { buildInsightMetrics, type InsightMetrics } from "./insightMetrics";
import { buildInsightPrompt, INSIGHT_PROMPT_VERSION } from "./prompt";
import { reserveAiCall } from "./quota";
import { fillInsight, validateInsight, type InsightPoint } from "./validate";

const RawSchema = z.object({
  points: z.array(z.object({ text: z.string() })),
});

const TTL_SECONDS = 7 * 24 * 60 * 60;

export type Insight = {
  points: InsightPoint[];
  warnings: string[];
  metrics: InsightMetrics; // 근거 칩 표시용 (우리 데이터 값)
  opportunity: Opportunity | null;
};

/**
 * AI 코멘트. 클라이언트가 보낸 수치는 믿지 않고 서버에서 요약을 다시 조회(캐시)해 쓴다.
 * 캐시 키에 두 데이터의 기준월을 넣어, 새 달 데이터가 나오면 코멘트도 새로 만든다.
 * 캐시에는 자리표시자가 남은 문장 틀만 저장하고 값은 매 요청 지금 데이터로 채운다
 * — 같은 기준월에 KOSIS가 수치를 고쳐도 문장 속 수치와 근거 칩이 항상 일치.
 */
export async function getInsight(category: MarketCategoryCode, hs: string): Promise<Cached<Insight>> {
  const [market, imports] = await Promise.all([getMarketSummary(category), getImportSummary(hs)]);
  const opportunity = classifyOpportunity(market.data.yoy, imports.data.yoy);
  const metrics = buildInsightMetrics(market.data, imports.data, opportunity);

  const key = [
    "ai-insight",
    INSIGHT_PROMPT_VERSION,
    getEnv().GEMINI_MODEL,
    category,
    hs,
    market.data.asOf,
    imports.data.asOf,
  ].join(":");

  const result = await getOrFetch(key, "ai-insight", TTL_SECONDS, async () => {
    await reserveAiCall();
    const prompt = buildInsightPrompt({
      categoryName: categoryName(category),
      hsLabel: hsIndex.describe6(hs.slice(0, 6))?.label ?? `HS ${hs}`,
      metrics,
    });
    const { data } = await generateJson({ ...prompt, schema: RawSchema });
    const validated = validateInsight(data, metrics);
    if (validated.templates.length === 0) {
      throw new UpstreamError("UPSTREAM_ERROR", `AI 코멘트가 모두 검증 탈락: ${validated.warnings.join(" / ")}`);
    }
    return validated;
  });

  const points = fillInsight(result.data.templates, metrics);
  if (points.length === 0) throw new UpstreamError("NO_DATA", "캐시된 코멘트가 쓰는 지표 값이 모두 사라짐");
  return { data: { points, warnings: result.data.warnings, metrics, opportunity }, cached: result.cached };
}
