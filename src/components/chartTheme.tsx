import type { ReactNode } from "react";
import { formatShortMonth } from "@/lib/format";

/** 차트 공통 스타일. 색은 globals.css 토큰만 쓴다. */

const tick = { fill: "var(--text-muted)", fontSize: 11 };

/** 월(YYYYMM) X축 */
export const monthAxisProps = {
  dataKey: "month",
  tickFormatter: formatShortMonth,
  tick,
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
  interval: "preserveStartEnd",
  minTickGap: 16,
} as const;

/** 값 Y축 (축선 없음, 격자로 대신) */
export const valueAxisProps = {
  tick,
  tickLine: false,
  axisLine: false,
} as const;

/** 가로 격자만 */
export const gridProps = { vertical: false, stroke: "var(--grid)" } as const;

/** 툴팁 상자. 제목(월)은 muted, 값은 본문 색 — 계열 색으로 글자를 칠하지 않는다. */
export function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="text-muted">{title}</p>
      {children}
    </div>
  );
}

/** 차트 카드 (제목 = 단일 계열 이름이라 범례 없음) */
export function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <div className="h-60">{children}</div>
    </figure>
  );
}
