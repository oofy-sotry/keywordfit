import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createCache, type CacheStore } from "@/lib/cache";
import { getEnv } from "@/lib/env";

/** 캐시 조회가 느려도 요청 전체를 붙잡지 않도록 짧게 끊는다. */
const CACHE_TIMEOUT_MS = 1500;

let client: SupabaseClient | undefined;

/** 서버 전용 클라이언트 (secret 키, 세션 저장 안 함). */
function getClient(): SupabaseClient {
  const env = getEnv();
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const supabaseCacheStore: CacheStore = {
  async get(key, now) {
    const { data, error } = await getClient()
      .from("api_cache")
      .select("payload")
      .eq("cache_key", key)
      .gt("expires_at", now.toISOString())
      .abortSignal(AbortSignal.timeout(CACHE_TIMEOUT_MS))
      .maybeSingle();
    if (error) throw error;
    return data?.payload ?? null;
  },
  async set({ key, source, payload, expiresAt }) {
    const { error } = await getClient()
      .from("api_cache")
      .upsert({ cache_key: key, source, payload, created_at: new Date().toISOString(), expires_at: expiresAt.toISOString() })
      .abortSignal(AbortSignal.timeout(CACHE_TIMEOUT_MS));
    if (error) throw error;
  },
};

/** 외부 API 결과는 이 함수를 거친다 (CLAUDE.md 규칙). */
export const { getOrFetch } = createCache(supabaseCacheStore);
