import type { HsData } from "./build";

export type Hs6 = {
  code: string; // 6자리 소호
  label: string; // 화면 표시명 (예: "말 > 번식용", "헤드폰과 이어폰(…)")
  heading: string; // 4단위 호 이름 (맥락)
};

function bigrams(text: string): string[] {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, i) => compact.slice(i, i + 2));
}

/** HS 코드표 인덱스. 데이터를 주입받아 테스트에서는 작은 표를 쓴다. */
export function createHsIndex(data: HsData) {
  const children = new Map<string, string[]>(); // 6자리 → 하위 10자리 이름들
  for (const [code, name] of Object.entries(data.codes10)) {
    const key = code.slice(0, 6);
    children.set(key, [...(children.get(key) ?? []), name]);
  }

  function describe6(code: string): Hs6 | null {
    if (!children.has(code)) return null;
    const parent5 = data.units5[code.slice(0, 5)];
    const own = data.units6[code] ?? data.codes10[`${code}0000`];
    const label = own ? (parent5 ? `${parent5} > ${own}` : own) : (parent5 ?? "기타");
    return { code, label, heading: data.units4[code.slice(0, 4)] ?? "" };
  }

  function exists(code: string): boolean {
    if (/^\d{10}$/.test(code)) return code in data.codes10;
    if (/^\d{6}$/.test(code)) return children.has(code);
    return false;
  }

  const entries = [...children.keys()].map((code) => {
    const info = describe6(code)!;
    return { info, label: info.label, heading: info.heading, children: children.get(code)!.join(" ") };
  });

  /**
   * 품명 검색 (AI 분류 실패 시 대체). 관세 품목표는 공식 용어라 일상 상품명과 잘 안 맞는다 — 보조 수단.
   * 1) 띄어쓴 단어: 단어마다 가장 잘 맞는 위치 하나만 (표시명 3 > 하위 품명 2 > 호 이름 1) × 단어 길이
   * 2) 단어로 하나도 못 찾으면(붙여 쓴 입력 등) 글자 쌍(bigram) 일치로 대체
   */
  function search(query: string, limit = 5): Hs6[] {
    const words = query.split(/\s+/).filter((w) => w.length >= 2);
    const grams = bigrams(query);
    if (grams.length === 0) return [];

    const fields = (e: (typeof entries)[number]) => [
      [e.label, 3],
      [e.children, 2],
      [e.heading, 1],
    ] as const;
    const wordScore = (e: (typeof entries)[number]) =>
      words.reduce((sum, w) => sum + w.length * Math.max(0, ...fields(e).map(([t, weight]) => (t.includes(w) ? weight : 0))), 0);
    const gramScore = (e: (typeof entries)[number]) =>
      fields(e).reduce((sum, [t, weight]) => sum + weight * grams.filter((g) => t.includes(g)).length, 0);

    // 단어 점수가 주 기준, 글자 쌍 점수는 동점일 때 보조 기준
    let scored = entries.map((e) => ({ info: e.info, score: wordScore(e) > 0 ? wordScore(e) * 100 + gramScore(e) : 0 }));
    if (!scored.some((s) => s.score > 0)) {
      // 글자 쌍이 절반 이상 맞아야 후보 (우연한 한 글자쌍 일치 제외)
      const minScore = Math.ceil(grams.length / 2);
      scored = entries.map((e) => ({ info: e.info, score: gramScore(e) })).map((s) => (s.score >= minScore ? s : { ...s, score: 0 }));
    }
    return scored
      .filter((s) => s.score > 0)
      .sort((x, y) => y.score - x.score || x.info.code.localeCompare(y.info.code))
      .slice(0, limit)
      .map((s) => s.info);
  }

  return { exists, describe6, search };
}
