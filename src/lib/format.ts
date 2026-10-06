import type { Yyyymm } from "@/lib/period";

const integer = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

export function formatMonth(yyyymm: Yyyymm): string {
  return `${yyyymm.slice(0, 4)}.${yyyymm.slice(4, 6)}`;
}

/** 차트 축용 짧은 표기 "YY.MM". */
export function formatShortMonth(yyyymm: Yyyymm): string {
  return `${yyyymm.slice(2, 4)}.${yyyymm.slice(4, 6)}`;
}

/** 달러 금액을 만·억 단위로 짧게. */
export function formatUsd(usd: number): string {
  if (Math.abs(usd) >= 1e8) return `$${(usd / 1e8).toFixed(1)}억`;
  if (Math.abs(usd) >= 1e4) return `$${integer.format(Math.round(usd / 1e4))}만`;
  return `$${integer.format(usd)}`;
}

/** KOSIS 거래액(백만원 단위)을 조·억·만원으로 짧게. */
export function formatKrwMillion(million: number | null): string {
  if (million === null) return "—";
  if (million === 0) return "0";
  if (Math.abs(million) >= 1e6) return `${(million / 1e6).toFixed(2)}조원`;
  if (Math.abs(million) >= 100) return `${integer.format(Math.round(million / 100))}억원`;
  return `${integer.format(million * 100)}만원`;
}

/** 차트 축용: 축 최댓값으로 단위를 하나 정해 모든 눈금을 같은 단위로 표시 (백만원 입력). */
export function krwAxisFormatter(maxMillion: number): (million: number) => string {
  const [divisor, unit] = maxMillion >= 1e6 ? [1e6, "조원"] : maxMillion >= 100 ? [100, "억원"] : [0.01, "만원"];
  return (million) => {
    if (million === 0) return "0";
    const value = Number((million / divisor).toFixed(2));
    return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${unit}`;
  };
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** [받침 있을 때, 받침 없을 때] */
const PARTICLES: [string, string][] = [
  ["이", "가"],
  ["은", "는"],
  ["을", "를"],
  ["과", "와"],
  ["으로", "로"],
];
const RIEUL = 8; // ㄹ 받침 인덱스

/** 값의 끝 받침: 받침 인덱스(0=없음), 판단 불가면 null. %는 "퍼센트"(받침 없음)로 읽는다. */
function finalConsonant(value: string): number | null {
  const last = value.trim().at(-1);
  if (!last) return null;
  if (last === "%") return 0;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28;
}

/**
 * 자리표시자에 채운 값 뒤의 조사를 받침에 맞게 고친다 (AI는 값을 모른 채 조사를 쓰므로 "미국가"처럼 어긋남).
 * 모르는 조사이거나 끝 글자로 판단할 수 없으면 그대로 둔다.
 */
export function fixParticle(value: string, particle: string): string {
  const pair = PARTICLES.find((p) => p.includes(particle));
  const jong = finalConsonant(value);
  if (!pair || jong === null) return particle;
  if (pair[0] === "으로") return jong === 0 || jong === RIEUL ? "로" : "으로";
  return jong === 0 ? pair[1] : pair[0];
}
