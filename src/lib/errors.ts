/** design.md §4 에러 코드. 섹션별 실패와 API 응답에 그대로 쓴다. */
export type ErrorCode =
  | "INVALID_INPUT"
  | "NO_DATA"
  | "UPSTREAM_AUTH"
  | "UPSTREAM_RATE_LIMIT"
  | "UPSTREAM_ERROR"
  | "AI_LIMIT";

/** 사용자에게 보여줄 메시지 (design.md §4). */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_INPUT: "입력을 확인해 주세요",
  NO_DATA: "이 품목은 최근 데이터가 없어요",
  UPSTREAM_AUTH: "서비스 설정 오류예요",
  UPSTREAM_RATE_LIMIT: "잠시 후 다시 시도해 주세요",
  UPSTREAM_ERROR: "데이터를 불러오지 못했어요",
  AI_LIMIT: "오늘 AI 한도를 다 썼어요",
};

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

/** API 응답 HTTP 상태 (design.md §4). NO_DATA는 정상 응답 안의 "없음"이라 200. */
const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  NO_DATA: 200,
  UPSTREAM_AUTH: 502,
  UPSTREAM_RATE_LIMIT: 429,
  UPSTREAM_ERROR: 502,
  AI_LIMIT: 429,
};

export function httpStatusOf(code: ErrorCode): number {
  return HTTP_STATUS[code];
}
