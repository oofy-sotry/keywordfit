import { describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { createCache, type CacheSource, type CacheStore } from "./cache";

const NOW = new Date("2026-10-06T00:00:00Z");

function memoryStore(): CacheStore & { rows: Map<string, { payload: unknown; expiresAt: Date }> } {
  const rows = new Map<string, { payload: unknown; expiresAt: Date }>();
  return {
    rows,
    async get(key, now) {
      const row = rows.get(key);
      return row && row.expiresAt > now ? row.payload : null;
    },
    async set({ key, payload, expiresAt }) {
      rows.set(key, { payload, expiresAt });
    },
  };
}

function setup(store: CacheStore, versions: Partial<Record<CacheSource, string>> = { kosis: "v1" }) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  return createCache(store, { versions, now: () => NOW });
}

describe("getOrFetch", () => {
  it("캐시에 없으면 조회해서 저장하고 cached=false", async () => {
    const store = memoryStore();
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const result = await setup(store).getOrFetch("k", "kosis", 3600, fetcher);
    expect(result).toEqual({ data: { v: 1 }, cached: false });
    expect(store.rows.get("v1:k")?.expiresAt).toEqual(new Date("2026-10-06T01:00:00Z"));
  });

  it("캐시에 있으면 조회하지 않고 cached=true", async () => {
    const store = memoryStore();
    const cache = setup(store);
    await cache.getOrFetch("k", "kosis", 3600, async () => ({ v: 1 }));
    const fetcher = vi.fn();
    expect(await cache.getOrFetch("k", "kosis", 3600, fetcher)).toEqual({ data: { v: 1 }, cached: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("만료된 캐시는 없는 것으로 본다", async () => {
    const store = memoryStore();
    store.rows.set("v1:k", { payload: { v: "old" }, expiresAt: new Date("2026-10-05T00:00:00Z") });
    const result = await setup(store).getOrFetch("k", "kosis", 60, async () => ({ v: "new" }));
    expect(result).toEqual({ data: { v: "new" }, cached: false });
  });

  it("캐시 읽기가 실패해도 원본을 조회해서 돌려준다", async () => {
    const store: CacheStore = {
      get: () => Promise.reject(new Error("supabase down")),
      set: () => Promise.resolve(),
    };
    expect(await setup(store).getOrFetch("k", "kosis", 60, async () => 42)).toEqual({ data: 42, cached: false });
  });

  it("캐시 쓰기가 실패해도 결과를 돌려준다", async () => {
    const store: CacheStore = {
      get: () => Promise.resolve(null),
      set: () => Promise.reject(new Error("supabase down")),
    };
    expect(await setup(store).getOrFetch("k", "kosis", 60, async () => 42)).toEqual({ data: 42, cached: false });
  });

  it("조회 실패는 그대로 던지고 저장하지 않는다", async () => {
    const store = memoryStore();
    const failing = () => Promise.reject(new UpstreamError("UPSTREAM_ERROR", "x"));
    await expect(setup(store).getOrFetch("k", "kosis", 60, failing)).rejects.toBeInstanceOf(UpstreamError);
    expect(store.rows.size).toBe(0);
  });

  it("버전이 다르면 이전 형태의 캐시를 쓰지 않는다 (요약 형태 변경 대비)", async () => {
    const store = memoryStore();
    await setup(store, { kosis: "v1" }).getOrFetch("k", "kosis", 3600, async () => ({ old: true }));
    const result = await setup(store, { kosis: "v2" }).getOrFetch("k", "kosis", 3600, async () => ({ fresh: true }));
    expect(result).toEqual({ data: { fresh: true }, cached: false });
    expect([...store.rows.keys()].sort()).toEqual(["v1:k", "v2:k"]);
  });

  it("버전은 출처별 — 시장 데이터 버전을 올려도 AI 결과 캐시는 그대로 (AI 재호출·결과 변동 방지)", async () => {
    const store = memoryStore();
    const before = setup(store, { kosis: "v1", "ai-classify": "v1" });
    await before.getOrFetch("p", "ai-classify", 3600, async () => ({ hs: "420232" }));
    const after = setup(store, { kosis: "v2", "ai-classify": "v1" });
    const fetcher = vi.fn();
    expect(await after.getOrFetch("p", "ai-classify", 3600, fetcher)).toEqual({ data: { hs: "420232" }, cached: true });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
