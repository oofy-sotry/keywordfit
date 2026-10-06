import { UpstreamError } from "@/lib/errors";
import { summarizeMarket, type MarketSummary } from "@/lib/metrics";
import { fetchMarketRows } from "./onlineShopping";

/** 상품군의 최근 24개월 온라인 거래액 요약. 데이터가 없으면 NO_DATA. */
export async function getMarketSummary(categoryCode: string): Promise<MarketSummary> {
  const summary = summarizeMarket(await fetchMarketRows(categoryCode));
  if (!summary) throw new UpstreamError("NO_DATA", `시장 데이터 없음: ${categoryCode}`);
  return summary;
}
