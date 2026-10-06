import { describe, expect, it } from "vitest";
import { formatMonth, formatSignedPercent, formatUsd } from "./format";

describe("formatMonth", () => {
  it("YYYYMM을 YYYY.MM으로", () => {
    expect(formatMonth("202608")).toBe("2026.08");
  });
});

describe("formatUsd", () => {
  it("만·억 단위로 줄인다", () => {
    expect(formatUsd(37_770_993)).toBe("$3,777만");
    expect(formatUsd(1_234_567_890)).toBe("$12.3억");
    expect(formatUsd(9_500)).toBe("$9,500");
  });
});

describe("formatSignedPercent", () => {
  it("부호를 붙인다", () => {
    expect(formatSignedPercent(11.8)).toBe("+11.8%");
    expect(formatSignedPercent(-3)).toBe("-3.0%");
    expect(formatSignedPercent(0)).toBe("0.0%");
  });

  it("null은 대시", () => {
    expect(formatSignedPercent(null)).toBe("—");
  });
});
