import { getEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { isHsCode } from "@/lib/hs/code";
import { fetchText } from "@/lib/http";
import { splitByYear, type MonthRange } from "@/lib/period";
import { parseTradeXml, type TradeRow } from "./parse";

const ENDPOINT = "https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList";

async function fetchChunk(hsCode: string, range: MonthRange): Promise<TradeRow[]> {
  const params = new URLSearchParams({
    serviceKey: getEnv().DATA_GO_KR_SERVICE_KEY, // Decoding 키 — URLSearchParams가 한 번만 인코딩
    strtYymm: range.start,
    endYymm: range.end,
    hsSgn: hsCode,
  });
  const { body } = await fetchText(`${ENDPOINT}?${params}`);
  return parseTradeXml(body);
}

/** 관세청 품목별 국가별 수출입실적. 조회 기간 1년 제한 때문에 1년 단위로 나눠 병렬 호출한다. */
export async function fetchTradeRows(hsCode: string, range: MonthRange): Promise<TradeRow[]> {
  if (!isHsCode(hsCode)) {
    throw new UpstreamError("INVALID_INPUT", `HS코드 형식 오류: ${hsCode}`);
  }
  const chunks = await Promise.all(splitByYear(range.start, range.end).map((r) => fetchChunk(hsCode, r)));
  return chunks.flat();
}
