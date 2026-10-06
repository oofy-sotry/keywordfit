import { getEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { startOfDayKst } from "@/lib/period";
import { countAiCallsToday, recordAiCall } from "@/lib/supabase";

/**
 * 무료 한도 보호: AI를 부르기 직전에 호출. 오늘(KST) 시도 수가 AI_DAILY_LIMIT 이상이면 AI_LIMIT.
 * 성공한 결과가 아니라 "시도"를 세야 실패를 반복하는 입력으로 한도를 우회할 수 없다.
 * 집계·기록이 실패하면 막지 않는다 (캐시 DB 장애가 기능 장애가 되지 않게).
 */
export async function reserveAiCall(now = new Date()): Promise<void> {
  let used: number | null = null;
  try {
    used = await countAiCallsToday(startOfDayKst(now));
  } catch (error) {
    console.error("[ai] 일일 호출 수 집계 실패, 상한 검사 건너뜀", error);
  }
  if (used !== null && used >= getEnv().AI_DAILY_LIMIT) {
    throw new UpstreamError("AI_LIMIT", `AI 일일 상한 도달: ${used}`);
  }
  try {
    await recordAiCall(now);
  } catch (error) {
    console.error("[ai] 호출 기록 실패", error);
  }
}
