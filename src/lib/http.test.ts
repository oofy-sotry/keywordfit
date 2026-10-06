import { afterEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { fetchText } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof UpstreamError ? error.code : "NOT_UPSTREAM";
  }
  return "NO_THROW";
}

describe("fetchText", () => {
  it("본문 텍스트와 상태 코드를 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<ok/>", { status: 200 })));
    await expect(fetchText("https://example.com")).resolves.toEqual({ status: 200, body: "<ok/>" });
  });

  it("403은 예외로 바꾸지 않는다 — 본문 해석은 호출한 쪽 몫 (공공데이터포털 키 오류)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<err/>", { status: 403 })));
    await expect(fetchText("https://example.com")).resolves.toEqual({ status: 403, body: "<err/>" });
  });

  it("429는 UPSTREAM_RATE_LIMIT", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    expect(await codeOf(fetchText("https://example.com"))).toBe("UPSTREAM_RATE_LIMIT");
  });

  it("5xx는 UPSTREAM_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    expect(await codeOf(fetchText("https://example.com"))).toBe("UPSTREAM_ERROR");
  });

  it("네트워크 오류는 UPSTREAM_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await codeOf(fetchText("https://example.com"))).toBe("UPSTREAM_ERROR");
  });

  it("타임아웃이 지나면 UPSTREAM_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
      ),
    );
    expect(await codeOf(fetchText("https://example.com", { timeoutMs: 10 }))).toBe("UPSTREAM_ERROR");
  });
});
