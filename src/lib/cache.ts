/** design.md §7 캐시 출처. api_cache.source 값. */
export type CacheSource = "kosis" | "customs" | "ai-classify" | "ai-insight";

/** 캐시 저장소. 만료된 행은 get에서 null을 돌려준다. */
export type CacheStore = {
  get(key: string, now: Date): Promise<unknown | null>;
  set(row: { key: string; source: CacheSource; payload: unknown; expiresAt: Date }): Promise<void>;
};

export type Cached<T> = { data: T; cached: boolean };

/**
 * 캐시 데이터 형태 버전. 저장하는 요약(ImportSummary, MarketSummary 등)의 필드를 바꾸면 올린다.
 * 키 앞에 붙어서 이전 형태의 캐시는 자동으로 무시된다 (만료 전이라도).
 */
export const CACHE_VERSION = "v3"; // v3: MarketSummary.yoy가 12개월 비교로 의미 변경

type CacheOptions = { version?: string; now?: () => Date };

/**
 * 캐시는 최적화일 뿐 의존성이 아니다 (design.md §2 원칙 3).
 * 저장소 읽기·쓰기가 실패하면 로그만 남기고 원본 조회 결과를 그대로 쓴다.
 */
export function createCache(store: CacheStore, { version = CACHE_VERSION, now = () => new Date() }: CacheOptions = {}) {
  async function getOrFetch<T>(
    baseKey: string,
    source: CacheSource,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<Cached<T>> {
    const key = `${version}:${baseKey}`;
    const at = now();
    try {
      const hit = await store.get(key, at);
      if (hit !== null) return { data: hit as T, cached: true };
    } catch (error) {
      console.error(`[cache] 읽기 실패, 원본 조회로 우회: ${key}`, error);
    }

    const data = await fetcher();

    try {
      await store.set({ key, source, payload: data, expiresAt: new Date(at.getTime() + ttlSeconds * 1000) });
    } catch (error) {
      console.error(`[cache] 쓰기 실패 (결과는 정상 반환): ${key}`, error);
    }
    return { data, cached: false };
  }

  return { getOrFetch };
}
