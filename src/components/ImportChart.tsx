"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame, gridProps, monthAxisProps, TooltipBox, valueAxisProps } from "@/components/chartTheme";
import { formatMonth, formatUsd } from "@/lib/format";
import { SOURCES } from "@/lib/sources";
import type { MonthlyImport } from "@/lib/metrics";

const integer = new Intl.NumberFormat("ko-KR");

function ImportTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyImport }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipBox title={formatMonth(point.month)}>
      <p className="font-semibold text-foreground">{formatUsd(point.usd)}</p>
      <p className="text-secondary">{integer.format(point.kg)} kg</p>
    </TooltipBox>
  );
}

/** 월별 수입액 */
export function ImportChart({ series }: { series: MonthlyImport[] }) {
  return (
    <ChartFrame title="월별 수입액 (USD)" source={SOURCES.customs}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps} />
          <YAxis {...valueAxisProps} tickFormatter={formatUsd} width={64} />
          <Tooltip content={<ImportTooltip />} cursor={{ fill: "var(--grid)" }} />
          <Bar dataKey="usd" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
