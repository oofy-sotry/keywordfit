/** design.md §7 캐시 출처. api_cache.source 값. */
export type CacheSource = "kosis" | "customs" | "ai-classify" | "ai-insight";

/** 캐시 저장소. 만료된 행은 get에서 null을 돌려준다. */
export type CacheStore = {
  get(key: string, now: Date): Promise<unknown | null>;
  set(row: { key: string; source: CacheSource; payload: unknown; expiresAt: Date }): Promise<void>;
};

export type Cached<T> = { data: T; cached: boolean };

/**
 * 출처별 캐시 데이터 형태 버전. 저장하는 값의 형태·의미를 바꾸면 **그 출처만** 올린다.
 * 키 앞에 붙어서 이전 형태의 캐시는 만료 전이라도 무시된다.
 * (한때 전역 버전 하나였는데, 시장 데이터 때문에 올리자 AI 분류·코멘트 캐시까지 지워져
 *  AI를 다시 부르고 분류 결과가 바뀐 일이 있어 출처별로 나눔 — D6)
 */
export const CACHE_VERSIONS: Record<CacheSource, string> = {
  kosis: "v3", // v3: MarketSummary.yoy가 12개월 비교로 의미 변경
  customs: "v3",
  "ai-classify": "v3", // AI는 PROMPT_VERSION도 캐시 키에 있음
  "ai-insight": "v3",
};

type CacheOptions = { versions?: Partial<Record<CacheSource, string>>; now?: () => Date };

/**
 * 캐시는 최적화일 뿐 의존성이 아니다 (design.md §2 원칙 3).
 * 저장소 읽기·쓰기가 실패하면 로그만 남기고 원본 조회 결과를 그대로 쓴다.
 */
export function createCache(store: CacheStore, { versions = {}, now = () => new Date() }: CacheOptions = {}) {
  const versionOf = (source: CacheSource) => versions[source] ?? CACHE_VERSIONS[source];
  async function getOrFetch<T>(
    baseKey: string,
    source: CacheSource,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<Cached<T>> {
    const key = `${versionOf(source)}:${baseKey}`;
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
