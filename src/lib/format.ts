import type { Yyyymm } from "@/lib/period";

const integer = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

export function formatMonth(yyyymm: Yyyymm): string {
  return `${yyyymm.slice(0, 4)}.${yyyymm.slice(4, 6)}`;
}

/** 달러 금액을 만·억 단위로 짧게. */
export function formatUsd(usd: number): string {
  if (Math.abs(usd) >= 1e8) return `$${(usd / 1e8).toFixed(1)}억`;
  if (Math.abs(usd) >= 1e4) return `$${integer.format(Math.round(usd / 1e4))}만`;
  return `$${integer.format(usd)}`;
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
