/** 관세청 HS부호 XLSX → data/hs-codes.json 변환 로직 (순수 함수). 스크립트에서만 쓴다. */

export type HsData = {
  units4: Record<string, string>; // 4단위(호) 이름
  units5: Record<string, string>; // 5단위(1단 소호) 이름 — 6단위 이름이 없거나 상대 이름("번식용")일 때 보완
  units6: Record<string, string>; // 6단위(2단 소호) 이름 — 분류·조회의 기본 단위
  codes10: Record<string, string>; // 10단위(HSK) 이름 (상위 기준 상대 이름이라 "기타"가 많음)
};

export type HsBuildInput = {
  codes: { code: string; end: number; name: string }[]; // 관세청_HS부호 (적용종료일자 = 엑셀 일련번호)
  units4: [string, string][];
  units6: [string, string][]; // "HS6단위(5단위포함)" 시트 — 5자리·6자리 혼재
  units10: [string, string][];
};

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** 날짜 → 엑셀 일련번호 (일 단위) */
export function excelSerial(date: Date): number {
  return Math.floor((date.getTime() - EXCEL_EPOCH) / 86_400_000);
}

export function buildHsData(input: HsBuildInput, todaySerial: number): HsData {
  const units10 = new Map(input.units10.map(([code, name]) => [code.trim(), name.trim()]));

  const codes10: Record<string, string> = {};
  for (const row of input.codes) {
    const code = row.code.trim();
    if (!/^\d{10}$/.test(code) || row.end < todaySerial) continue;
    codes10[code] = units10.get(code) ?? row.name.trim();
  }

  const prefixes = (length: number) => new Set(Object.keys(codes10).map((code) => code.slice(0, length)));
  const pick = (rows: [string, string][], length: number) => {
    const valid = prefixes(length);
    return Object.fromEntries(
      rows.map(([c, n]) => [c.trim(), n.trim()]).filter(([c]) => c.length === length && valid.has(c)),
    );
  };

  return {
    units4: pick(input.units4, 4),
    units5: pick(input.units6, 5),
    units6: pick(input.units6, 6),
    codes10,
  };
}
