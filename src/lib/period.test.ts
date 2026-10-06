import { describe, expect, it } from "vitest";
import { addMonths, getRecentMonths, listMonths, splitByYear } from "./period";

describe("addMonths", () => {
  it("같은 해 안에서 더하고 뺀다", () => {
    expect(addMonths("202608", 1)).toBe("202609");
    expect(addMonths("202608", -7)).toBe("202601");
  });

  it("연도 경계를 넘는다", () => {
    expect(addMonths("202612", 1)).toBe("202701");
    expect(addMonths("202601", -1)).toBe("202512");
    expect(addMonths("202609", -23)).toBe("202410");
  });

  it("형식이 잘못되면 에러를 던진다", () => {
    expect(() => addMonths("2026-08", 1)).toThrow();
    expect(() => addMonths("202613", 1)).toThrow();
  });
});

describe("getRecentMonths", () => {
  it("이번 달을 빼고 직전 달까지 count개월 범위를 준다", () => {
    expect(getRecentMonths(new Date(2026, 9, 6), 24)).toEqual({ start: "202410", end: "202609" });
  });

  it("1월이면 전년 12월에서 끝난다", () => {
    expect(getRecentMonths(new Date(2026, 0, 15), 12)).toEqual({ start: "202501", end: "202512" });
  });
});

describe("listMonths", () => {
  it("시작과 끝을 포함해 나열한다", () => {
    expect(listMonths("202511", "202602")).toEqual(["202511", "202512", "202601", "202602"]);
  });

  it("시작이 끝보다 뒤면 빈 배열", () => {
    expect(listMonths("202603", "202602")).toEqual([]);
  });
});

describe("splitByYear", () => {
  it("24개월을 12개월씩 2구간으로 나눈다 (관세청 1년 제한)", () => {
    expect(splitByYear("202410", "202609")).toEqual([
      { start: "202410", end: "202509" },
      { start: "202510", end: "202609" },
    ]);
  });

  it("12개월 이하는 한 구간", () => {
    expect(splitByYear("202601", "202608")).toEqual([{ start: "202601", end: "202608" }]);
  });

  it("나누어떨어지지 않으면 마지막 구간이 짧다", () => {
    expect(splitByYear("202501", "202602")).toEqual([
      { start: "202501", end: "202512" },
      { start: "202601", end: "202602" },
    ]);
  });
});
