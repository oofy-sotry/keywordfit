import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/classify", () => ({ classifyProduct: vi.fn() }));

const { classifyProduct } = await import("@/lib/ai/classify");
const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/classify", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.7" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const result = { category: null, hsCandidates: [], warnings: [], source: "search" as const };

beforeEach(() => {
  vi.mocked(classifyProduct).mockReset().mockResolvedValue({ data: result, cached: false });
});

describe("POST /api/classify", () => {
  it("빈 상품명·40자 초과·JSON 아님은 400 INVALID_INPUT", async () => {
    for (const body of [{ product: "  " }, { product: "가".repeat(41) }, "not json", {}]) {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: "INVALID_INPUT" });
    }
    expect(classifyProduct).not.toHaveBeenCalled();
  });

  it("상품명 앞뒤 공백을 지우고 분류 결과를 그대로 내려준다", async () => {
    const response = await post({ product: "  무선 이어폰 " });
    expect(classifyProduct).toHaveBeenCalledWith("무선 이어폰", expect.stringMatching(/^[0-9a-f]{16}$/)); // IP 해시
    expect(await response.json()).toEqual({ ok: true, product: "무선 이어폰", data: result, cached: false });
  });
});
