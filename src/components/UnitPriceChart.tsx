"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame, gridProps, monthAxisProps, TooltipBox, valueAxisProps } from "@/components/chartTheme";
import { formatMonth } from "@/lib/format";
import { SOURCES } from "@/lib/sources";
import type { MonthlyImport } from "@/lib/metrics";

function PriceTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyImport }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipBox title={formatMonth(point.month)}>
      <p className="font-semibold text-foreground">
        {point.unitPrice === null ? "중량 정보 없음" : `$${point.unitPrice.toFixed(2)} / kg`}
      </p>
    </TooltipBox>
  );
}

/** kg당 수입 단가. 수입액과 단위가 달라 별도 차트로 그린다 (이중 축 금지). */
export function UnitPriceChart({ series }: { series: MonthlyImport[] }) {
  return (
    <ChartFrame title="kg당 수입 단가 (USD/kg)" source={SOURCES.customs}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps} />
          <YAxis {...valueAxisProps} tickFormatter={(v: number) => `$${v}`} width={48} domain={["auto", "auto"]} />
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
    </ChartFrame>
  );
}
