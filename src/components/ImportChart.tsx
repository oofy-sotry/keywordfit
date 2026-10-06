"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth, formatUsd } from "@/lib/format";
import type { MonthlyImport } from "@/lib/metrics";

const integer = new Intl.NumberFormat("ko-KR");

function ImportTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyImport }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="text-muted">{formatMonth(point.month)}</p>
      <p className="font-semibold text-foreground">{formatUsd(point.usd)}</p>
      <p className="text-secondary">{integer.format(point.kg)} kg</p>
    </div>
  );
}

/** 월별 수입액 (단일 계열 → 범례 없음, 제목이 계열 이름). */
export function ImportChart({ series }: { series: MonthlyImport[] }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold">월별 수입액 (USD)</figcaption>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => `${m.slice(2, 4)}.${m.slice(4)}`}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickFormatter={formatUsd}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<ImportTooltip />} cursor={{ fill: "var(--grid)" }} />
            <Bar dataKey="usd" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
