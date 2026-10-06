import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";

vi.mock("@/lib/customs/imports", () => ({ getImportSummary: vi.fn() }));
vi.mock("@/lib/kosis/market", () => ({ getMarketSummary: vi.fn() }));

const { getImportSummary } = await import("@/lib/customs/imports");
const { getMarketSummary } = await import("@/lib/kosis/market");
const { GET } = await import("./route");

const importSummary = { asOf: "202608" };
const marketSummary = { asOf: "202608" };

async function call(query: string) {
  const response = await GET(new NextRequest(`http://localhost/api/analyze?${query}`));
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.mocked(getImportSummary).mockReset().mockResolvedValue({ data: importSummary as never, cached: false });
  vi.mocked(getMarketSummary).mockReset().mockResolvedValue({ data: marketSummary as never, cached: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/analyze", () => {
  it("파라미터가 없으면 400 INVALID_INPUT", async () => {
    expect(await call("")).toEqual({ status: 400, body: { ok: false, error: "INVALID_INPUT" } });
  });

  it("목록에 없는 상품군이나 형식이 틀린 HS코드는 400", async () => {
    expect((await call("category=999")).status).toBe(400);
    expect((await call("hs=85")).status).toBe(400);
  });

  it("상품군만 주면 시장 섹션만 조회하고 수입 섹션은 null", async () => {
    const { status, body } = await call("category=0021");
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, category: "0021", hs: null, imports: null });
    expect(body.market).toEqual({ ok: true, data: marketSummary, cached: true });
    expect(getImportSummary).not.toHaveBeenCalled();
  });

  it("HS코드 표기(점·하이픈)를 정규화해서 조회한다", async () => {
    await call("hs=8518.30");
    expect(getImportSummary).toHaveBeenCalledWith("851830");
  });

  it("한 섹션이 실패해도 다른 섹션은 정상으로 내려간다", async () => {
    vi.mocked(getMarketSummary).mockRejectedValue(new UpstreamError("UPSTREAM_AUTH", "KOSIS 키 오류"));
    const { status, body } = await call("category=0021&hs=851830");
    expect(status).toBe(200);
    expect(body.market).toEqual({ ok: false, error: "UPSTREAM_AUTH" });
    expect(body.imports).toEqual({ ok: true, data: importSummary, cached: false });
  });
});
