import { describe, expect, it } from "vitest";
import { readUrlState, writeUrlState } from "./urlState";

describe("readUrlState", () => {
  it("상품명·상품군·HS코드를 읽고 검증한다", () => {
    expect(readUrlState("?q=%EB%AC%B4%EC%84%A0+%EC%9D%B4%EC%96%B4%ED%8F%B0&category=0022&hs=8518.30")).toEqual({
      product: "무선 이어폰",
      category: "0022",
      hs: "851830",
    });
  });

  it("목록에 없는 상품군·형식이 틀린 HS코드는 버린다 (URL은 누구나 고칠 수 있음)", () => {
    expect(readUrlState("?category=999&hs=85")).toEqual({ product: "", category: "", hs: "" });
  });

  it("상품명은 앞뒤 공백 제거, 40자까지", () => {
    expect(readUrlState(`?q=${encodeURIComponent("  " + "가".repeat(50))}`).product).toHaveLength(40);
  });

  it("빈 쿼리는 모두 빈 값", () => {
    expect(readUrlState("")).toEqual({ product: "", category: "", hs: "" });
  });
});

describe("writeUrlState", () => {
  it("값이 있는 것만 쿼리로", () => {
    expect(writeUrlState({ product: "무선 이어폰", category: "0022", hs: "851830" })).toBe(
      "?q=%EB%AC%B4%EC%84%A0+%EC%9D%B4%EC%96%B4%ED%8F%B0&category=0022&hs=851830",
    );
    expect(writeUrlState({ product: "", category: "", hs: "851830" })).toBe("?hs=851830");
  });

  it("전부 비면 빈 문자열", () => {
    expect(writeUrlState({ product: " ", category: "", hs: "" })).toBe("");
  });
});
