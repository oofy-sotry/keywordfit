import { UpstreamError } from "@/lib/errors";

export type FetchTextOptions = { timeoutMs?: number; init?: RequestInit };

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * 외부 API 공통 fetch. 네트워크 오류·타임아웃·429·5xx만 여기서 UpstreamError로 바꾼다.
 * 그 외 상태(4xx 포함)는 본문과 함께 돌려준다 — 공공데이터포털·KOSIS는 오류 내용을 본문에 담기 때문.
 */
export async function fetchText(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS, init }: FetchTextOptions = {},
): Promise<{ status: number; body: string }> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new UpstreamError("UPSTREAM_ERROR", `요청 실패 (${new URL(url).host}): ${reason}`);
  }

  if (response.status === 429) {
    throw new UpstreamError("UPSTREAM_RATE_LIMIT", `429 (${new URL(url).host})`);
  }
  if (response.status >= 500) {
    throw new UpstreamError("UPSTREAM_ERROR", `${response.status} (${new URL(url).host})`);
  }
  return { status: response.status, body: await response.text() };
}
