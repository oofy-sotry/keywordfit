import { toErrorCode, type ErrorCode } from "@/lib/errors";

/** /api/analyze 응답의 섹션 단위 결과. 한 섹션이 실패해도 나머지는 그대로 내려간다 (design.md §2 원칙 2). */
export type Section<T> = { ok: true; data: T; cached: boolean } | { ok: false; error: ErrorCode };

/** 섹션 로더를 실행해 Section으로 감싼다. 실패 원인은 서버 로그에만 남기고 클라이언트에는 코드만. */
export async function toSection<T>(
  name: string,
  load: () => Promise<{ data: T; cached: boolean }>,
): Promise<Section<T>> {
  try {
    const { data, cached } = await load();
    return { ok: true, data, cached };
  } catch (error) {
    const code = toErrorCode(error);
    if (code !== "NO_DATA") console.error(`[section:${name}]`, error);
    return { ok: false, error: code };
  }
}
