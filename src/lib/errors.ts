/** design.md §4 에러 코드. 섹션별 실패와 API 응답에 그대로 쓴다. */
export type ErrorCode =
  | "INVALID_INPUT"
  | "NO_DATA"
  | "UPSTREAM_AUTH"
  | "UPSTREAM_RATE_LIMIT"
  | "UPSTREAM_ERROR"
  | "AI_LIMIT";

/** 외부 API 실패. message는 서버 로그용이고 사용자에게는 code만 내려보낸다. */
export class UpstreamError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export function toErrorCode(error: unknown): ErrorCode {
  return error instanceof UpstreamError ? error.code : "UPSTREAM_ERROR";
}
