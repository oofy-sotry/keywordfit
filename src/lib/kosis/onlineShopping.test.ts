import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: () => ({ KOSIS_API_KEY: "MTY3=" }) }));
const { fetchMarketRows } = await import("./onlineShopping");

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return "NO_THROW";
}

describe("fetchMarketRows (fetch mock)", () => {
  it("확정된 표·항목·분류 파라미터로 호출하고 정규화한다 (jsonVD=Y 포함)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ PRD_DE: "202608", C1: "0021", C1_NM: "가전·전자", DT: "1337360" }])));
    const rows = await fetchMarketRows("0021");
    expect(rows).toEqual([{ month: "202608", categoryCode: "0021", categoryName: "가전·전자", amount: 1337360 }]);
    const params = new URL(fetchMock.mock.calls[0][0] as string).searchParams;
    expect(Object.fromEntries(["tblId", "itmId", "objL1", "objL2", "prdSe", "newEstPrdCnt", "jsonVD", "apiKey"].map((k) => [k, params.get(k)]))).toEqual({
      tblId: "DT_1KE10041",
      itmId: "T20",
      objL1: "0021",
      objL2: "00",
      prdSe: "M",
      newEstPrdCnt: "24",
      jsonVD: "Y",
      apiKey: "MTY3=",
    });
  });

  it("키 오류(HTTP 200 + err 11)는 UPSTREAM_AUTH", async () => {
    fetchMock.mockResolvedValue(new Response('{"err":"11","errMsg":"유효하지 않은 인증KEY입니다."}'));
    expect(await codeOf(fetchMarketRows("0021"))).toBe("UPSTREAM_AUTH");
  });

  it("429는 UPSTREAM_RATE_LIMIT, 타임아웃은 UPSTREAM_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    expect(await codeOf(fetchMarketRows("0021"))).toBe("UPSTREAM_RATE_LIMIT");
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    expect(await codeOf(fetchMarketRows("0021"))).toBe("UPSTREAM_ERROR");
  });

  it("목록에 없는 상품군이면 호출하지 않고 INVALID_INPUT", async () => {
    expect(await codeOf(fetchMarketRows("999"))).toBe("INVALID_INPUT");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
