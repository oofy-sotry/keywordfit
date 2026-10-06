import { describe, expect, it } from "vitest";
import { buildHsData, excelSerial } from "./build";

describe("excelSerial", () => {
  it("엑셀 일련번호로 변환 (46387 = 2026-12-31)", () => {
    expect(excelSerial(new Date(Date.UTC(2026, 11, 31)))).toBe(46387);
  });
});

describe("buildHsData", () => {
  const today = 46300; // 2026-10 무렵
  const input = {
    codes: [
      { code: "8518304000", end: 46387, name: "유선전화 핸드세트" },
      { code: "8518309000", end: 46387, name: "기타" },
      { code: "8518309000", end: 45000, name: "기타(옛 행)" }, // 같은 코드의 만료 행
      { code: "8519000000", end: 45000, name: "폐지된 코드" }, // 만료
      { code: "0101211000", end: 46387, name: "농가 사육용" },
    ],
    units4: [
      ["8518", "마이크로폰, 헤드폰과 이어폰"],
      ["8519", "폐지된 호"],
      ["0101", "말"],
    ] as [string, string][],
    units6: [
      ["851830", "헤드폰과 이어폰"],
      ["851900", "폐지된 소호"],
      ["010121", "번식용"],
    ] as [string, string][],
    units10: [["8518309000", "기타"]] as [string, string][],
  };

  it("적용종료일이 지난 코드는 뺀다", () => {
    const data = buildHsData(input, today);
    expect(Object.keys(data.codes10).sort()).toEqual(["0101211000", "8518304000", "8518309000"]);
  });

  it("10자리 이름은 단위별 품목명 우선, 없으면 HS부호 파일 이름", () => {
    const data = buildHsData(input, today);
    expect(data.codes10["8518309000"]).toBe("기타");
    expect(data.codes10["8518304000"]).toBe("유선전화 핸드세트");
  });

  it("4·6단위는 유효한 10자리 코드의 상위만 남긴다", () => {
    const data = buildHsData(input, today);
    expect(data.units6).toEqual({ "851830": "헤드폰과 이어폰", "010121": "번식용" });
    expect(data.units4).toEqual({ "8518": "마이크로폰, 헤드폰과 이어폰", "0101": "말" });
  });

  it("코드 앞뒤 공백·숫자형 코드를 정리한다", () => {
    const data = buildHsData({ ...input, codes: [{ code: " 8518309000 ", end: 46387, name: "기타" }] }, today);
    expect(Object.keys(data.codes10)).toEqual(["8518309000"]);
  });
});
