import { describe, expect, it } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { parseKosisJson, parseStatValue } from "./parse";

// 2026-10-06 실제 응답에서 발췌 (DT_1KE10041, objL1=0021, objL2=00, 최근 2개월)
const SAMPLE = JSON.stringify([
  { C1: "0021", C1_NM: "가전·전자", C2: "00", C2_NM: "계", DT: "1719873", PRD_DE: "202607", PRD_SE: "M", ITM_ID: "T20", UNIT_NM: "백만원" },
  { C1: "0021", C1_NM: "가전·전자", C2: "00", C2_NM: "계", DT: "1337360", PRD_DE: "202608", PRD_SE: "M", ITM_ID: "T20", UNIT_NM: "백만원" },
]);

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof UpstreamError ? error.code : "NOT_UPSTREAM";
  }
  return "NO_THROW";
}

describe("parseStatValue", () => {
  it("문자열 수치를 숫자로", () => {
    expect(parseStatValue("1337360")).toBe(1337360);
    expect(parseStatValue(" 12.5 ")).toBe(12.5);
  });

  it("'-'·빈값·비수치는 null (0으로 취급하지 않음)", () => {
    expect(parseStatValue("-")).toBeNull();
    expect(parseStatValue("")).toBeNull();
    expect(parseStatValue(undefined)).toBeNull();
    expect(parseStatValue("x")).toBeNull();
  });
});

describe("parseKosisJson", () => {
  it("월·상품군·거래액(백만원)으로 정규화하고 월 순으로 정렬한다", () => {
    const reversed = JSON.stringify([...JSON.parse(SAMPLE)].reverse());
    expect(parseKosisJson(reversed)).toEqual([
      { month: "202607", categoryCode: "0021", categoryName: "가전·전자", amount: 1719873 },
      { month: "202608", categoryCode: "0021", categoryName: "가전·전자", amount: 1337360 },
    ]);
  });

  it("유효하지 않은 인증키(err 11)는 UPSTREAM_AUTH", () => {
    expect(codeOf(() => parseKosisJson('{"err":"11","errMsg":"유효하지 않은 인증KEY입니다."}'))).toBe("UPSTREAM_AUTH");
  });

  it("조회 결과 없음(err 30)은 NO_DATA", () => {
    expect(codeOf(() => parseKosisJson('{"err":"30","errMsg":"조회결과가 없습니다."}'))).toBe("NO_DATA");
  });

  it("호출 제한(err 40번대)은 UPSTREAM_RATE_LIMIT", () => {
    expect(codeOf(() => parseKosisJson('{"err":"40","errMsg":"호출가능건수 제한"}'))).toBe("UPSTREAM_RATE_LIMIT");
  });

  it("잘못된 요청 변수(err 21) 등 나머지는 UPSTREAM_ERROR", () => {
    expect(codeOf(() => parseKosisJson('{"err":"21","errMsg":"잘못된 요청 변수를 호출 하였습니다."}'))).toBe("UPSTREAM_ERROR");
  });

  it("jsonVD=Y를 빼먹어 키에 따옴표가 없는 응답은 UPSTREAM_ERROR", () => {
    expect(codeOf(() => parseKosisJson('[{TBL_ID:"DT_1KE10041",DT:"1337360"}]'))).toBe("UPSTREAM_ERROR");
  });

  it("빈 배열은 빈 배열", () => {
    expect(parseKosisJson("[]")).toEqual([]);
  });
});
