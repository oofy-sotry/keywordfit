import { z } from "zod";
import type { Cached } from "@/lib/cache";
import { toErrorCode, UpstreamError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { hsIndex } from "@/lib/hs/hsIndex";
import { isMarketCategory, categoryName, MARKET_CATEGORIES } from "@/lib/kosis/categories";
import { getOrFetch } from "@/lib/supabase";
import { generateJson } from "./client";
import { buildClassifyPrompt, normalizeProductKey, PROMPT_VERSION } from "./prompt";
import { reserveAiCall } from "./quota";
import { validateClassification, type Classification } from "./validate";

const RawSchema = z.object({
  categoryCode: z.string(),
  hsCandidates: z.array(z.object({ code: z.string(), reason: z.string() })),
});

const TTL_SECONDS = 7 * 24 * 60 * 60;
const SEARCH_LIMIT = 3;

export type ProductClassification = Classification & { source: "ai" | "search" };

const deps = {
  categoryName: (code: string) => (isMarketCategory(code) ? categoryName(code) : null),
  describe6: hsIndex.describe6,
};

/** AI 분류 → 서버 검증 → 7일 캐시. 검증 후 후보가 없으면 실패로 보고 캐시하지 않는다. */
async function classifyWithAi(product: string, client: string): Promise<Cached<ProductClassification>> {
  const key = `ai-classify:${PROMPT_VERSION}:${getEnv().GEMINI_MODEL}:${normalizeProductKey(product)}`;
  return getOrFetch(key, "ai-classify", TTL_SECONDS, async () => {
    await reserveAiCall({ client });
    const { data } = await generateJson({ ...buildClassifyPrompt(product, MARKET_CATEGORIES), schema: RawSchema });
    const result = validateClassification(data, deps);
    if (result.hsCandidates.length === 0) {
      throw new UpstreamError("NO_DATA", `AI 후보가 모두 검증 탈락: ${result.warnings.join(", ")}`);
    }
    return { ...result, source: "ai" as const };
  });
}

/**
 * 상품명 → 상품군·HS 후보. AI가 실패하면(한도·장애·후보 없음) 품명 검색으로 대체한다.
 * 대체 결과는 캐시하지 않는다 — 다음 요청에서 AI를 다시 시도하도록.
 */
export async function classifyProduct(product: string, client = "unknown"): Promise<Cached<ProductClassification>> {
  try {
    return await classifyWithAi(product, client);
  } catch (error) {
    const code = toErrorCode(error);
    if (code !== "NO_DATA" && code !== "AI_LIMIT") console.error("[classify] AI 분류 실패, 품명 검색으로 대체", error);
    const hits = hsIndex.search(product, SEARCH_LIMIT);
    return {
      data: {
        category: null,
        hsCandidates: hits.map((hit) => ({ ...hit, reason: "품명 검색 결과" })),
        warnings: [code === "AI_LIMIT" ? "오늘 AI 분류 한도를 다 써서 품명 검색 결과를 보여줘요" : "AI 분류에 실패해 품명 검색 결과를 보여줘요"],
        source: "search",
      },
      cached: false,
    };
  }
}
