import { UpstreamError, type ErrorCode } from "@/lib/errors";
import type { Yyyymm } from "@/lib/period";

/** KOSIS 온라인쇼핑동향 1행. 거래액 단위는 백만원, 값이 없으면 null. */
export type MarketRow = {
  month: Yyyymm;
  categoryCode: string;
  categoryName: string;
  amount: number | null;
};

type RawRow = { PRD_DE?: string; C1?: string; C1_NM?: string; DT?: string };

/** KOSIS DT는 문자열이고 "-" 같은 비수치가 올 수 있다. 0과 "없음"을 구분하려고 null을 쓴다. */
export function parseStatValue(value: string | undefined): number | null {
  const text = value?.trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** KOSIS 오류 코드 → ErrorCode. 오류도 HTTP 200 + {err, errMsg}로 온다. */
function errorCodeOf(err: string): ErrorCode {
  if (err === "10" || err === "11") return "UPSTREAM_AUTH"; // 인증키 누락·무효
  if (err === "30") return "NO_DATA"; // 조회 결과 없음
  if (err.startsWith("4")) return "UPSTREAM_RATE_LIMIT"; // 호출 건수·행 수·사용자 제한
  return "UPSTREAM_ERROR";
}

export function parseKosisJson(body: string): MarketRow[] {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    // jsonVD=Y를 빼먹으면 키에 따옴표가 없는 비표준 JSON이 온다
    throw new UpstreamError("UPSTREAM_ERROR", "KOSIS 응답이 JSON이 아님 (jsonVD=Y 확인)");
  }

  if (!Array.isArray(data)) {
    const { err = "", errMsg = "" } = (data ?? {}) as { err?: string; errMsg?: string };
    throw new UpstreamError(errorCodeOf(String(err)), `KOSIS 오류 ${err}: ${errMsg}`);
  }

  return (data as RawRow[])
    .map((row) => ({
      month: row.PRD_DE ?? "",
      categoryCode: row.C1 ?? "",
      categoryName: row.C1_NM ?? "",
      amount: parseStatValue(row.DT),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
