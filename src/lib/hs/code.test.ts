import { describe, expect, it } from "vitest";
import { isHsCode, normalizeHsInput } from "./code";

describe("normalizeHsInput", () => {
  it("점·하이픈·공백을 지운다", () => {
    expect(normalizeHsInput(" 8518.30-9000 ")).toBe("8518309000");
  });
});

describe("isHsCode", () => {
  it("6자리 또는 10자리 숫자만 허용", () => {
    expect(isHsCode("851830")).toBe(true);
    expect(isHsCode("8518309000")).toBe(true);
    expect(isHsCode("8518")).toBe(false);
    expect(isHsCode("85183090")).toBe(false);
    expect(isHsCode("85183a")).toBe(false);
  });
});
