import type { Cached } from "@/lib/cache";
import { UpstreamError } from "@/lib/errors";
import { summarizeImports, type ImportSummary } from "@/lib/metrics";
import { getRecentMonths, listMonths } from "@/lib/period";
import { getOrFetch } from "@/lib/supabase";
import { fetchTradeRows } from "./trade";

// 24개월 + 미공표 가능성 2개월
const REQUEST_MONTHS = 26;
// 월 1회 공표 데이터
const TTL_SECONDS = 24 * 60 * 60;

/** HS코드의 최근 24개월 수입 요약 (24시간 캐시). 공표된 데이터가 없으면 NO_DATA. */
export async function getImportSummary(hsCode: string, today = new Date()): Promise<Cached<ImportSummary>> {
  const range = getRecentMonths(today, REQUEST_MONTHS);
  return getOrFetch(`customs:${hsCode}:${range.start}-${range.end}`, "customs", TTL_SECONDS, async () => {
    const rows = await fetchTradeRows(hsCode, range);
    const summary = summarizeImports(rows, listMonths(range.start, range.end));
    if (!summary) throw new UpstreamError("NO_DATA", `수입 실적 없음: ${hsCode}`);
    return summary;
  });
}
