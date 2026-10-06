import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";

vi.mock("@/lib/ai/insight", () => ({ getInsight: vi.fn() }));

const { getInsight } = await import("@/lib/ai/insight");
const { POST } = await import("./route");

function post(body: unknown) {
  return POST(new Request("http://localhost/api/insight", { method: "POST", body: JSON.stringify(body) }));
}

const insight = { points: [], warnings: [], metrics: {}, opportunity: null };

beforeEach(() => {
  vi.mocked(getInsight).mockReset().mockResolvedValue({ data: insight as never, cached: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/insight", () => {
  it("상품군·HS코드가 둘 다 있어야 한다", async () => {
    for (const body of [{ category: "0021" }, { hs: "851830" }, { category: "999", hs: "851830" }, { category: "0021", hs: "85" }]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(getInsight).not.toHaveBeenCalled();
  });

  it("HS 표기를 정규화해서 조회하고 결과를 내려준다", async () => {
    const response = await post({ category: "0021", hs: "8518.30" });
    expect(getInsight).toHaveBeenCalledWith("0021", "851830");
    expect(await response.json()).toEqual({ ok: true, data: insight, cached: true });
  });

  it("실패는 코드와 HTTP 상태로 (원인 문구는 내려보내지 않음)", async () => {
    vi.mocked(getInsight).mockRejectedValue(new UpstreamError("AI_LIMIT", "내부 사유"));
    const response = await post({ category: "0021", hs: "851830" });
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "AI_LIMIT" });
  });
});
