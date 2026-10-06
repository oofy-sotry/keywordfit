import { describe, expect, it } from "vitest";
import {
  fixParticle,
  formatKrwMillion,
  formatMonth,
  formatShortMonth,
  formatSignedPercent,
  formatUsd,
  krwAxisFormatter,
} from "./format";

describe("formatMonth", () => {
  it("YYYYMM을 YYYY.MM으로", () => {
    expect(formatMonth("202608")).toBe("2026.08");
  });
});

describe("formatShortMonth", () => {
  it("차트 축용 YY.MM", () => {
    expect(formatShortMonth("202608")).toBe("26.08");
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

describe("formatKrwMillion", () => {
  it("백만원 단위 값을 조·억으로 줄인다", () => {
    expect(formatKrwMillion(1_337_360)).toBe("1.34조원");
    expect(formatKrwMillion(268_495)).toBe("2,685억원");
    expect(formatKrwMillion(50)).toBe("5,000만원");
    expect(formatKrwMillion(0)).toBe("0");
  });

  it("null은 대시", () => {
    expect(formatKrwMillion(null)).toBe("—");
  });
});

describe("krwAxisFormatter", () => {
  it("축 최댓값 기준으로 한 단위를 고른다 — 조 단위", () => {
    const fmt = krwAxisFormatter(1_800_000);
    expect([0, 450_000, 900_000, 1_350_000, 1_800_000].map(fmt)).toEqual(["0", "0.45조원", "0.9조원", "1.35조원", "1.8조원"]);
  });

  it("억 단위", () => {
    const fmt = krwAxisFormatter(268_495);
    expect([100_000, 250_000].map(fmt)).toEqual(["1,000억원", "2,500억원"]);
  });

  it("만 단위", () => {
    expect(krwAxisFormatter(50)(50)).toBe("5,000만원");
  });
});

describe("fixParticle", () => {
  it("값의 마지막 글자 받침에 맞춰 조사를 고친다", () => {
    expect(fixParticle("미국", "가")).toBe("이");
    expect(fixParticle("중국", "는")).toBe("은");
    expect(fixParticle("$20.3억", "를")).toBe("을");
    expect(fixParticle("일본", "와")).toBe("과");
    expect(fixParticle("베트남", "로")).toBe("으로");
  });

  it("받침이 없으면 받침 없는 조사로", () => {
    expect(fixParticle("말레이시아", "이")).toBe("가");
    expect(fixParticle("태국 아세안", "을")).toBe("을");
    expect(fixParticle("말레이시아", "으로")).toBe("로");
  });

  it("ㄹ 받침은 '로'", () => {
    expect(fixParticle("브라질", "으로")).toBe("로");
  });

  it("%는 '퍼센트'(받침 없음)로 읽는다", () => {
    expect(fixParticle("+5.3%", "을")).toBe("를");
    expect(fixParticle("51.9%", "이")).toBe("가");
  });

  it("판단할 수 없는 끝 글자(숫자·기호)나 모르는 조사는 그대로", () => {
    expect(fixParticle("$80.52/kg", "를")).toBe("를");
    expect(fixParticle("중국", "에서")).toBe("에서");
  });
});
