"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame, gridProps, monthAxisProps, TooltipBox, valueAxisProps } from "@/components/chartTheme";
import { formatKrwMillion, formatMonth, krwAxisFormatter } from "@/lib/format";
import type { MonthlyMarket } from "@/lib/metrics";

function MarketTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyMarket }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipBox title={formatMonth(point.month)}>
      <p className="font-semibold text-foreground">{formatKrwMillion(point.amount)}</p>
    </TooltipBox>
  );
}

/** 상품군 온라인 거래액 24개월 */
export function MarketChart({ title, series }: { title: string; series: MonthlyMarket[] }) {
  // 한 축에 조·억이 섞이지 않게 최댓값 기준 단위 하나로
  const axisFormatter = krwAxisFormatter(Math.max(0, ...series.map((m) => m.amount ?? 0)));
  return (
    <ChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...monthAxisProps} />
          <YAxis {...valueAxisProps} tickFormatter={axisFormatter} width={64} domain={[0, "auto"]} />
          <Tooltip content={<MarketTooltip />} cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }} />
          <Line
            type="linear"
            dataKey="amount"
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
