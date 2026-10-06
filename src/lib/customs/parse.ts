import { XMLParser } from "fast-xml-parser";
import { UpstreamError } from "@/lib/errors";
import type { Yyyymm } from "@/lib/period";

/** 관세청 품목별 국가별 수출입실적 1행 (월 × 10자리 HS × 국가). 금액 USD, 중량 kg. */
export type TradeRow = {
  month: Yyyymm;
  hsCode: string;
  countryCode: string;
  countryName: string;
  importUsd: number;
  importKg: number;
  exportUsd: number;
  exportKg: number;
};

// 값은 전부 문자열로 받는다 — 숫자 변환 시 HS코드 앞자리 0("0101…")이 사라지기 때문
const parser = new XMLParser({ parseTagValue: false, isArray: (name) => name === "item" });

type RawItem = Record<string, string | undefined>;

/** 공공데이터포털 게이트웨이 오류 코드 (returnReasonCode) */
const GATEWAY_ERRORS: Record<string, UpstreamError["code"]> = {
  "20": "UPSTREAM_AUTH", // 서비스 접근 거부
  "22": "UPSTREAM_RATE_LIMIT", // 요청 제한 횟수 초과
  "30": "UPSTREAM_AUTH", // 등록되지 않은 서비스키
  "31": "UPSTREAM_AUTH", // 기한 만료된 서비스키
};

function toNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toRow(item: RawItem): TradeRow {
  return {
    month: (item.year ?? "").replace(".", ""),
    hsCode: item.hsCd ?? "",
    countryCode: item.statCd ?? "",
    countryName: item.statCdCntnKor1 ?? "",
    importUsd: toNumber(item.impDlr),
    importKg: toNumber(item.impWgt),
    exportUsd: toNumber(item.expDlr),
    exportKg: toNumber(item.expWgt),
  };
}

export function parseTradeXml(xml: string): TradeRow[] {
  const doc = parser.parse(xml);

  const gateway = doc?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (gateway) {
    const reason = String(gateway.returnReasonCode ?? "");
    throw new UpstreamError(
      GATEWAY_ERRORS[reason] ?? "UPSTREAM_ERROR",
      `관세청 게이트웨이 오류 ${reason}: ${gateway.returnAuthMsg ?? gateway.errMsg ?? ""}`,
    );
  }

  const response = doc?.response;
  if (!response?.header) throw new UpstreamError("UPSTREAM_ERROR", "관세청 응답 형식이 아님");

  const resultCode = String(response.header.resultCode ?? "");
  if (resultCode !== "00") {
    throw new UpstreamError("UPSTREAM_ERROR", `관세청 오류 ${resultCode}: ${response.header.resultMsg ?? ""}`);
  }

  const items: RawItem[] = response.body?.items?.item ?? [];
  // 첫 행은 year="총계" 합계 행 → 제외
  return items.filter((item) => item.year !== "총계").map(toRow);
}
