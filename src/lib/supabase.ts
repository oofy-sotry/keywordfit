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

/** AI 호출 기록 행 — 일일 상한 집계용. 성공·실패와 무관하게 호출 직전에 남긴다. */
const AI_CALL_SOURCE = "ai-call";
const AI_CALL_TTL_MS = 2 * 24 * 60 * 60 * 1000;

export async function recordAiCall(now: Date): Promise<void> {
  const { error } = await getClient()
    .from("api_cache")
    .insert({
      cache_key: `${AI_CALL_SOURCE}:${now.toISOString()}:${crypto.randomUUID()}`,
      source: AI_CALL_SOURCE,
      payload: {},
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + AI_CALL_TTL_MS).toISOString(),
    })
    .abortSignal(AbortSignal.timeout(CACHE_TIMEOUT_MS));
  if (error) throw error;
}

/** since 이후 AI 호출 시도 수 (실패한 호출 포함). */
export async function countAiCallsToday(since: Date): Promise<number> {
  const { count, error } = await getClient()
    .from("api_cache")
    .select("cache_key", { count: "exact", head: true })
    .eq("source", AI_CALL_SOURCE)
    .gte("created_at", since.toISOString())
    .abortSignal(AbortSignal.timeout(CACHE_TIMEOUT_MS));
  if (error) throw error;
  return count ?? 0;
}
