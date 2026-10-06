import type { Cached } from "@/lib/cache";
import { UpstreamError } from "@/lib/errors";
import { summarizeMarket, type MarketSummary } from "@/lib/metrics";
import { getOrFetch } from "@/lib/supabase";
import { fetchMarketRows, MARKET_MONTHS } from "./onlineShopping";

// 월 1회 공표 데이터
const TTL_SECONDS = 24 * 60 * 60;

/** 상품군의 최근 24개월 온라인 거래액 요약 (24시간 캐시). 데이터가 없으면 NO_DATA. */
export async function getMarketSummary(categoryCode: string): Promise<Cached<MarketSummary>> {
  return getOrFetch(`kosis:${categoryCode}:${MARKET_MONTHS}`, "kosis", TTL_SECONDS, async () => {
    const summary = summarizeMarket(await fetchMarketRows(categoryCode));
    if (!summary) throw new UpstreamError("NO_DATA", `시장 데이터 없음: ${categoryCode}`);
    return summary;
  });
}
