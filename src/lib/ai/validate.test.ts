import { describe, expect, it } from "vitest";
import type { Hs6 } from "@/lib/hs/hsCodes";
import type { InsightMetrics } from "./insightMetrics";
import { fillInsight, validateClassification, validateInsight } from "./validate";

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

describe("validateInsight", () => {
  const metrics: InsightMetrics = {
    marketYoy: "+5.3%",
    marketLatest: "1.34조원",
    importYoy: "+11.8%",
    importRecent12: "$6.3억",
    topCountry: "중국",
    topCountryShare: "51.9%",
    unitPrice: "$80.52/kg",
    opportunity: null,
  };
  const point = (text: string) => ({ text });

  it("자리표시자를 남긴 문장 틀과 쓰인 지표 키를 돌려준다 (값은 캐시하지 않음)", () => {
    const result = validateInsight({ points: [point("시장은 {{marketYoy}} 성장, 수입은 {{importYoy}} 늘었어요.")] }, metrics);
    expect(result.templates).toEqual([
      { text: "시장은 {{marketYoy}} 성장, 수입은 {{importYoy}} 늘었어요.", metrics: ["marketYoy", "importYoy"] },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("자리표시자 밖에 숫자가 있으면(AI가 수치를 지어냄) 그 포인트를 뺀다", () => {
    const result = validateInsight({ points: [point("시장은 {{marketYoy}}, 수입은 약 20% 늘었어요.")] }, metrics);
    expect(result.templates).toEqual([]);
    expect(result.warnings[0]).toContain("숫자");
  });

  it("모르는 키·값이 없는 지표를 쓰면 뺀다", () => {
    const result = validateInsight(
      { points: [point("{{profitMargin}}이 높아요."), point("등급은 {{opportunity}}예요."), point("{{topCountry}} 비중이 커요.")] },
      metrics,
    );
    expect(result.templates.map((t) => t.text)).toEqual(["{{topCountry}} 비중이 커요."]);
    expect(result.warnings).toHaveLength(2);
  });

  it("자리표시자를 순위 숫자 자리에 쓰면('{{topCountry}}위' → '미국위') 뺀다", () => {
    const result = validateInsight({ points: [point("{{topCountry}}이 수입액 {{topCountry}}위를 차지해요.")] }, metrics);
    expect(result.templates).toEqual([]);
    expect(result.warnings[0]).toContain("순위");
  });

  it("근거 지표가 하나도 없는 문장은 뺀다", () => {
    expect(validateInsight({ points: [point("좋은 시장이에요.")] }, metrics).templates).toEqual([]);
  });

  it("최대 4개, 같은 문장 중복 제거", () => {
    const same = point("{{topCountry}} 비중이 커요.");
    const many = [same, same, ...["marketYoy", "importYoy", "unitPrice", "importRecent12"].map((k) => point(`{{${k}}} 참고`))];
    const result = validateInsight({ points: many }, metrics);
    expect(result.templates).toHaveLength(4);
    expect(result.templates.filter((t) => t.text === "{{topCountry}} 비중이 커요.")).toHaveLength(1);
  });
});

describe("fillInsight", () => {
  const templates = [
    { text: "시장은 {{marketYoy}} 성장했어요.", metrics: ["marketYoy" as const] },
    { text: "단가는 {{unitPrice}}예요.", metrics: ["unitPrice" as const] },
  ];

  it("요청 시점의 우리 데이터로 채운다 (캐시 후 수치가 바뀌어도 문장과 근거 칩이 일치)", () => {
    const fresh = { marketYoy: "+6.0%", unitPrice: "$81.00/kg" } as InsightMetrics;
    expect(fillInsight(templates, fresh)).toEqual([
      { text: "시장은 6.0% 성장했어요.", metrics: ["marketYoy"] },
      { text: "단가는 $81.00/kg예요.", metrics: ["unitPrice"] },
    ]);
  });

  it("그사이 값이 없어진 지표를 쓰는 문장은 뺀다", () => {
    const partial = { marketYoy: "+6.0%", unitPrice: null } as InsightMetrics;
    expect(fillInsight(templates, partial).map((p) => p.text)).toEqual(["시장은 6.0% 성장했어요."]);
  });

  it("채운 값의 받침에 맞게 바로 뒤 조사를 고친다", () => {
    const tpl = [
      { text: "{{topCountry}}가 1위예요.".replace("1", "첫"), metrics: ["topCountry" as const] },
      { text: "{{importRecent12}}를 기록했어요.", metrics: ["importRecent12" as const] },
      { text: "{{topCountry}}에서 들어와요.", metrics: ["topCountry" as const] },
    ];
    const values = { topCountry: "미국", importRecent12: "$20.3억" } as InsightMetrics;
    expect(fillInsight(tpl, values).map((p) => p.text)).toEqual([
      "미국이 첫위예요.",
      "$20.3억을 기록했어요.",
      "미국에서 들어와요.",
    ]);
  });

  it("증감률 뒤에 같은 방향의 말이 오면 부호를 뺀다 (\"-22.6% 줄어\" → \"22.6% 줄어\")", () => {
    const tpl = [
      { text: "수입은 {{importYoy}} 줄어들었어요.", metrics: ["importYoy" as const] },
      { text: "수입은 {{importYoy}}로 감소했어요.", metrics: ["importYoy" as const] },
      { text: "시장은 {{marketYoy}} 커졌어요.", metrics: ["marketYoy" as const] },
    ];
    const values = { importYoy: "-22.6%", marketYoy: "+6.8%" } as InsightMetrics;
    expect(fillInsight(tpl, values).map((p) => p.text)).toEqual([
      "수입은 22.6% 줄어들었어요.",
      "수입은 22.6%로 감소했어요.",
      "시장은 6.8% 커졌어요.",
    ]);
  });

  it("방향이 반대거나 방향어가 없으면 부호를 그대로 둔다 (수치를 바꾸지 않게)", () => {
    const tpl = [
      { text: "수입은 {{importYoy}} 늘었어요.", metrics: ["importYoy" as const] },
      { text: "전년 대비 {{importYoy}}예요.", metrics: ["importYoy" as const] },
    ];
    const values = { importYoy: "-22.6%" } as InsightMetrics;
    expect(fillInsight(tpl, values).map((p) => p.text)).toEqual([
      "수입은 -22.6% 늘었어요.",
      "전년 대비 -22.6%예요.",
    ]);
  });
});

