import { describe, expect, it } from "vitest";
import { classifyOpportunity, IMPORT_GROWTH_THRESHOLD, MARKET_GROWTH_THRESHOLD } from "./opportunity";

describe("classifyOpportunity", () => {
  it("4분면 분류", () => {
    expect(classifyOpportunity(8, 2)?.grade).toBe("opportunity"); // 시장↑ 수입→
    expect(classifyOpportunity(8, 25)?.grade).toBe("growing"); // 시장↑ 수입↑
    expect(classifyOpportunity(1, 25)?.grade).toBe("overheated"); // 시장→ 수입↑
    expect(classifyOpportunity(-3, -5)?.grade).toBe("shrinking"); // 시장↓ 수입↓
  });

  it("경계값은 '이상'이면 성장·증가로 본다", () => {
    expect(MARKET_GROWTH_THRESHOLD).toBe(5);
    expect(IMPORT_GROWTH_THRESHOLD).toBe(10);
    expect(classifyOpportunity(5, 9.9)?.grade).toBe("opportunity");
    expect(classifyOpportunity(4.9, 9.9)?.grade).toBe("shrinking");
    expect(classifyOpportunity(5, 10)?.grade).toBe("growing");
    expect(classifyOpportunity(4.9, 10)?.grade).toBe("overheated");
  });

  it("둘 중 하나라도 null이면 판단하지 않는다", () => {
    expect(classifyOpportunity(null, 10)).toBeNull();
    expect(classifyOpportunity(5, null)).toBeNull();
  });

  it("등급과 함께 입력값·라벨·설명을 돌려준다", () => {
    expect(classifyOpportunity(8.1, 23)).toEqual({
      grade: "growing",
      label: "성장 중·경쟁 유입",
      description: "수요가 늘지만 수입(공급)도 빠르게 늘고 있어요",
      marketYoy: 8.1,
      importYoy: 23,
    });
  });
});
