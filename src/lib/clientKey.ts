import { createHash } from "node:crypto";

/**
 * AI 호출 제한용 요청자 키. Vercel이 넣어 주는 x-forwarded-for(첫 값) / x-real-ip를 SHA-256으로 해시해
 * 앞 16자만 쓴다 — IP 원문은 저장하지 않는다 (호출 기록은 2일 뒤 만료).
 */
export function clientKey(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  if (!ip) return "unknown";
  return createHash("sha256").update(`keywordfit:${ip}`).digest("hex").slice(0, 16);
}
