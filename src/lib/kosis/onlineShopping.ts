import { getEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { fetchText } from "@/lib/http";
import { isMarketCategory } from "./categories";
import { parseKosisJson, type MarketRow } from "./parse";

const ENDPOINT = "https://kosis.kr/openapi/Param/statisticsParameterData.do";

/** 24개월 시계열 = 최근 12개월 + 직전 12개월 비교에 필요한 최근 공표 개월 수 */
export const MARKET_MONTHS = 24;

/** KOSIS 온라인쇼핑몰 상품군별 거래액 (DT_1KE10041), 최근 공표 기준 count개월. */
export async function fetchMarketRows(categoryCode: string, count = MARKET_MONTHS): Promise<MarketRow[]> {
  if (!isMarketCategory(categoryCode)) {
    throw new UpstreamError("INVALID_INPUT", `상품군 코드 오류: ${categoryCode}`);
  }
  const params = new URLSearchParams({
    method: "getList",
    apiKey: getEnv().KOSIS_API_KEY,
    orgId: "101",
    tblId: "DT_1KE10041",
    itmId: "T20", // 거래액
    objL1: categoryCode, // 상품군
    objL2: "00", // 취급상품범위: 계
    prdSe: "M",
    newEstPrdCnt: String(count),
    format: "json",
    jsonVD: "Y", // 없으면 키에 따옴표 없는 비표준 JSON이 옴
  });
  const { body } = await fetchText(`${ENDPOINT}?${params}`);
  return parseKosisJson(body);
}
