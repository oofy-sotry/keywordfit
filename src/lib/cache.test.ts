import { describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { createCache, type CacheStore } from "./cache";

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

function setup(store: CacheStore) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  return createCache(store, () => NOW);
}

describe("getOrFetch", () => {
  it("캐시에 없으면 조회해서 저장하고 cached=false", async () => {
    const store = memoryStore();
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const result = await setup(store).getOrFetch("k", "kosis", 3600, fetcher);
    expect(result).toEqual({ data: { v: 1 }, cached: false });
    expect(store.rows.get("k")?.expiresAt).toEqual(new Date("2026-10-06T01:00:00Z"));
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
    store.rows.set("k", { payload: { v: "old" }, expiresAt: new Date("2026-10-05T00:00:00Z") });
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
});
