import { getEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { startOfDayKst } from "@/lib/period";
import { countAiCallsToday } from "@/lib/supabase";

/**
 * 무료 한도 보호: 오늘 AI 호출이 AI_DAILY_LIMIT 이상이면 AI_LIMIT.
 * 집계가 실패하면 막지 않는다 (캐시 DB 장애가 기능 장애가 되지 않게).
 */
export async function assertAiQuota(now = new Date()): Promise<void> {
  let used: number;
  try {
    used = await countAiCallsToday(startOfDayKst(now));
  } catch (error) {
    console.error("[ai] 일일 호출 수 집계 실패, 상한 검사 건너뜀", error);
    return;
  }
  if (used >= getEnv().AI_DAILY_LIMIT) {
    throw new UpstreamError("AI_LIMIT", `AI 일일 상한 도달: ${used}`);
  }
}
