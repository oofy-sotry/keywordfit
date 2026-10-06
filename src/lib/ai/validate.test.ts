import { describe, expect, it } from "vitest";
import type { Hs6 } from "@/lib/hs/hsCodes";
import { validateClassification } from "./validate";

const table: Record<string, Hs6> = {
  "851830": { code: "851830", label: "헤드폰과 이어폰", heading: "마이크로폰, 확성기, 헤드폰" },
  "851762": { code: "851762", label: "음성ㆍ영상 송수신 기기", heading: "전화기" },
};
const deps = {
  categoryName: (code: string) => ({ "0021": "가전·전자", "0022": "통신기기" })[code] ?? null,
  describe6: (code: string) => table[code] ?? null,
};

describe("validateClassification", () => {
  it("정상 출력은 코드표 이름으로 채운다 (AI가 쓴 품명이 아니라)", () => {
    const result = validateClassification(
      { categoryCode: "0021", hsCandidates: [{ code: "851830", reason: "이어폰" }] },
      deps,
    );
    expect(result).toEqual({
      category: { code: "0021", name: "가전·전자" },
      hsCandidates: [{ code: "851830", label: "헤드폰과 이어폰", heading: "마이크로폰, 확성기, 헤드폰", reason: "이어폰" }],
      warnings: [],
    });
  });

  it("코드표에 없는 HS코드(환각)는 빼고 경고", () => {
    const result = validateClassification(
      { categoryCode: "0021", hsCandidates: [{ code: "851899", reason: "x" }, { code: "851830", reason: "y" }] },
      deps,
    );
    expect(result.hsCandidates.map((c) => c.code)).toEqual(["851830"]);
    expect(result.warnings).toContain("코드표에 없는 HS코드 제외: 851899");
  });

  it("점·공백 표기는 정리하고, 유효한 10자리는 6자리로 올린다", () => {
    const result = validateClassification(
      { categoryCode: "0021", hsCandidates: [{ code: "8518.30", reason: "a" }, { code: "8517620000", reason: "b" }] },
      deps,
    );
    expect(result.hsCandidates.map((c) => c.code)).toEqual(["851830", "851762"]);
  });

  it("4자리 등 형식이 틀린 코드는 빼고 경고", () => {
    const result = validateClassification({ categoryCode: "0021", hsCandidates: [{ code: "8518", reason: "a" }] }, deps);
    expect(result.hsCandidates).toEqual([]);
    expect(result.warnings).toContain("형식이 틀린 HS코드 제외: 8518");
  });

  it("중복은 하나만, 최대 3개", () => {
    const many = ["851830", "8518.30", "851762", "851830", "851762"].map((code) => ({ code, reason: "r" }));
    const result = validateClassification({ categoryCode: "0021", hsCandidates: many }, deps);
    expect(result.hsCandidates.map((c) => c.code)).toEqual(["851830", "851762"]);
  });

  it("목록에 없는 상품군은 null + 경고 (사용자가 직접 고르게)", () => {
    const result = validateClassification({ categoryCode: "999", hsCandidates: [] }, deps);
    expect(result.category).toBeNull();
    expect(result.warnings).toContain("목록에 없는 상품군 제외: 999");
  });

  it("이유는 앞뒤 공백 제거, 100자까지", () => {
    const result = validateClassification(
      { categoryCode: "0021", hsCandidates: [{ code: "851830", reason: `  ${"가".repeat(150)}  ` }] },
      deps,
    );
    expect(result.hsCandidates[0].reason).toHaveLength(100);
  });
});
