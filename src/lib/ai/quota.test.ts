import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";

vi.mock("@/lib/supabase", () => ({ countAiCallsToday: vi.fn(), recordAiCall: vi.fn() }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ AI_DAILY_LIMIT: 3 }) }));

const { countAiCallsToday, recordAiCall } = await import("@/lib/supabase");
const { reserveAiCall } = await import("./quota");

const NOW = new Date("2026-10-06T03:00:00Z"); // KST 12:00

beforeEach(() => {
  vi.mocked(countAiCallsToday).mockReset().mockResolvedValue(0);
  vi.mocked(recordAiCall).mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reserveAiCall", () => {
  it("한도 미만이면 호출 기록을 남긴다 (성공·실패와 무관하게 시도 횟수로 셈)", async () => {
    vi.mocked(countAiCallsToday).mockResolvedValue(2);
    await reserveAiCall(NOW);
    expect(countAiCallsToday).toHaveBeenCalledWith(new Date("2026-10-05T15:00:00Z")); // KST 오늘 0시
    expect(recordAiCall).toHaveBeenCalledWith(NOW);
  });

  it("한도에 도달하면 AI_LIMIT, 기록하지 않는다", async () => {
    vi.mocked(countAiCallsToday).mockResolvedValue(3);
    await expect(reserveAiCall(NOW)).rejects.toMatchObject({ code: "AI_LIMIT" });
    await expect(reserveAiCall(NOW)).rejects.toBeInstanceOf(UpstreamError);
    expect(recordAiCall).not.toHaveBeenCalled();
  });

  it("집계가 실패해도 막지 않는다 (캐시 DB 장애가 기능 장애가 되지 않게)", async () => {
    vi.mocked(countAiCallsToday).mockRejectedValue(new Error("db down"));
    await expect(reserveAiCall(NOW)).resolves.toBeUndefined();
  });

  it("기록이 실패해도 막지 않는다", async () => {
    vi.mocked(recordAiCall).mockRejectedValue(new Error("db down"));
    await expect(reserveAiCall(NOW)).resolves.toBeUndefined();
  });
});
