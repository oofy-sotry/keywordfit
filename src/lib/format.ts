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

export function formatSignedPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
