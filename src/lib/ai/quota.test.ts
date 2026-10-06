import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/errors";

vi.mock("@/lib/supabase", () => ({ countAiCallsToday: vi.fn(), recordAiCall: vi.fn() }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ AI_DAILY_LIMIT: 3, AI_PER_CLIENT_DAILY_LIMIT: 2 }) }));

const { countAiCallsToday, recordAiCall } = await import("@/lib/supabase");
const { reserveAiCall } = await import("./quota");

const NOW = new Date("2026-10-06T03:00:00Z"); // KST 12:00
const SINCE = new Date("2026-10-05T15:00:00Z"); // KST 오늘 0시

/** 전체 사용량, 이 호출자 사용량 */
function usage(total: number, mine: number) {
  vi.mocked(countAiCallsToday).mockImplementation(async (_since, client) => (client ? mine : total));
}

beforeEach(() => {
  vi.mocked(countAiCallsToday).mockReset();
  usage(0, 0);
  vi.mocked(recordAiCall).mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reserveAiCall", () => {
  it("한도 미만이면 호출자 키와 함께 기록을 남긴다 (성공·실패와 무관하게 시도 횟수로 셈)", async () => {
    usage(2, 1);
    await reserveAiCall({ now: NOW, client: "abc" });
    expect(countAiCallsToday).toHaveBeenCalledWith(SINCE);
    expect(countAiCallsToday).toHaveBeenCalledWith(SINCE, "abc");
    expect(recordAiCall).toHaveBeenCalledWith(NOW, "abc");
  });

  it("전체 한도에 도달하면 AI_LIMIT, 기록하지 않는다", async () => {
    usage(3, 0);
    await expect(reserveAiCall({ now: NOW, client: "abc" })).rejects.toBeInstanceOf(UpstreamError);
    await expect(reserveAiCall({ now: NOW, client: "abc" })).rejects.toMatchObject({ code: "AI_LIMIT" });
    expect(recordAiCall).not.toHaveBeenCalled();
  });

  it("한 호출자가 자기 한도에 도달하면 전체 여유가 있어도 AI_LIMIT (한 사람이 전체 한도를 다 쓰지 못하게)", async () => {
    usage(1, 2);
    await expect(reserveAiCall({ now: NOW, client: "abc" })).rejects.toMatchObject({ code: "AI_LIMIT" });
  });

  it("집계가 실패해도 막지 않는다 (캐시 DB 장애가 기능 장애가 되지 않게)", async () => {
    vi.mocked(countAiCallsToday).mockRejectedValue(new Error("db down"));
    await expect(reserveAiCall({ now: NOW, client: "abc" })).resolves.toBeUndefined();
  });

  it("기록이 실패해도 막지 않는다", async () => {
    vi.mocked(recordAiCall).mockRejectedValue(new Error("db down"));
    await expect(reserveAiCall({ now: NOW, client: "abc" })).resolves.toBeUndefined();
  });
});
