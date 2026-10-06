/** HS코드 형식 규칙. 서버·클라이언트 공용이라 서버 전용 모듈(env 등)을 import하지 않는다. */

/** 6자리(소호) 또는 10자리(HSK). 6자리면 관세청 API가 하위 10자리 코드를 전부 준다. */
export const HS_CODE_PATTERN = /^(\d{6}|\d{10})$/;

/** "8518.30-9000" 같은 표기를 숫자만 남긴다. */
export function normalizeHsInput(input: string): string {
  return input.replace(/[.\-\s]/g, "");
}

export function isHsCode(value: string): boolean {
  return HS_CODE_PATTERN.test(value);
}
