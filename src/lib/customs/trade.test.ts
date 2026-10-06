import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: () => ({ DATA_GO_KR_SERVICE_KEY: "ab/c+d==" }) }));
const { fetchTradeRows } = await import("./trade");

const OK = (month: string) =>
  `<response><header><resultCode>00</resultCode></header><body><items><item><year>총계</year></item><item><year>${month}</year><hsCd>8518309000</hsCd><statCd>CN</statCd><statCdCntnKor1>중국</statCdCntnKor1><impDlr>10</impDlr><impWgt>1</impWgt><expDlr>0</expDlr><expWgt>0</expWgt></item></items></body></response>`;
const KEY_ERROR = `<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;

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

describe("fetchTradeRows (fetch mock)", () => {
  it("1년 단위로 나눠 호출하고 합친다, 서비스키는 한 번만 인코딩", async () => {
    fetchMock.mockImplementation(async (url: string) => new Response(OK(new URL(url).searchParams.get("endYymm")!.replace(/(\d{4})(\d{2})/, "$1.$2"))));
    const rows = await fetchTradeRows("851830", { start: "202409", end: "202608" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.month)).toEqual(["202508", "202608"]);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("serviceKey=ab%2Fc%2Bd%3D%3D"); // 이중 인코딩이면 %252F
    expect(new URL(url).searchParams.get("hsSgn")).toBe("851830");
  });

  it("키 오류(HTTP 403 + 게이트웨이 XML)는 UPSTREAM_AUTH", async () => {
    fetchMock.mockResolvedValue(new Response(KEY_ERROR, { status: 403 }));
    expect(await codeOf(fetchTradeRows("851830", { start: "202601", end: "202608" }))).toBe("UPSTREAM_AUTH");
  });

  it("429는 UPSTREAM_RATE_LIMIT", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    expect(await codeOf(fetchTradeRows("851830", { start: "202601", end: "202608" }))).toBe("UPSTREAM_RATE_LIMIT");
  });

  it("네트워크 오류·타임아웃은 UPSTREAM_ERROR", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    expect(await codeOf(fetchTradeRows("851830", { start: "202601", end: "202608" }))).toBe("UPSTREAM_ERROR");
  });

  it("HS코드 형식이 틀리면 호출하지 않고 INVALID_INPUT", async () => {
    expect(await codeOf(fetchTradeRows("8518", { start: "202601", end: "202608" }))).toBe("INVALID_INPUT");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
