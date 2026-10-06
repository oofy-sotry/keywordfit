import { UpstreamError } from "@/lib/errors";
import { summarizeImports, type ImportSummary } from "@/lib/metrics";
import { getRecentMonths, listMonths } from "@/lib/period";
import { fetchTradeRows } from "./trade";

// 24개월 + 미공표 가능성 2개월
const REQUEST_MONTHS = 26;

/** HS코드의 최근 24개월 수입 요약. 공표된 데이터가 없으면 NO_DATA. */
export async function getImportSummary(hsCode: string, today = new Date()): Promise<ImportSummary> {
  const range = getRecentMonths(today, REQUEST_MONTHS);
  const rows = await fetchTradeRows(hsCode, range);
  const summary = summarizeImports(rows, listMonths(range.start, range.end));
  if (!summary) throw new UpstreamError("NO_DATA", `수입 실적 없음: ${hsCode}`);
  return summary;
}
