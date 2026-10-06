/** 월 표기는 전부 "YYYYMM" 문자열로 통일한다 (KOSIS PRD_DE, 관세청 요청 파라미터와 같음). */
export type Yyyymm = string;

export type MonthRange = { start: Yyyymm; end: Yyyymm };

const PATTERN = /^(\d{4})(0[1-9]|1[0-2])$/;

function toIndex(yyyymm: Yyyymm): number {
  const match = PATTERN.exec(yyyymm);
  if (!match) throw new Error(`잘못된 월 형식: ${yyyymm} (YYYYMM)`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function fromIndex(index: number): Yyyymm {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}${String(month).padStart(2, "0")}`;
}

export function addMonths(yyyymm: Yyyymm, n: number): Yyyymm {
  return fromIndex(toIndex(yyyymm) + n);
}

/** 이번 달(데이터 미완성)을 빼고 직전 달에서 끝나는 count개월 범위. 실제 공표 여부는 응답에서 판단한다. */
export function getRecentMonths(today: Date, count: number): MonthRange {
  const end = fromIndex(today.getFullYear() * 12 + today.getMonth() - 1);
  return { start: addMonths(end, -(count - 1)), end };
}

export function listMonths(start: Yyyymm, end: Yyyymm): Yyyymm[] {
  const from = toIndex(start);
  const to = toIndex(end);
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => fromIndex(from + i));
}

/** 관세청 API는 조회 기간이 최대 1년이라 12개월 단위로 나눈다. */
export function splitByYear(start: Yyyymm, end: Yyyymm): MonthRange[] {
  const months = listMonths(start, end);
  const ranges: MonthRange[] = [];
  for (let i = 0; i < months.length; i += 12) {
    const chunk = months.slice(i, i + 12);
    ranges.push({ start: chunk[0], end: chunk[chunk.length - 1] });
  }
  return ranges;
}
