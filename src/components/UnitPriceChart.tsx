"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth } from "@/lib/format";
import type { MonthlyImport } from "@/lib/metrics";

function PriceTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyImport }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="text-muted">{formatMonth(point.month)}</p>
      <p className="font-semibold text-foreground">
        {point.unitPrice === null ? "중량 정보 없음" : `$${point.unitPrice.toFixed(2)} / kg`}
      </p>
    </div>
  );
}

/** kg당 수입 단가. 수입액과 단위가 달라 별도 차트로 그린다 (이중 축 금지). */
export function UnitPriceChart({ series }: { series: MonthlyImport[] }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold">kg당 수입 단가 (USD/kg)</figcaption>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              tickFormatter={(v: number) => `$${v}`}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<PriceTooltip />} cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }} />
            <Line
              type="linear"
              dataKey="unitPrice"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
