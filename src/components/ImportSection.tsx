import { CountryShareTable } from "@/components/CountryShareTable";
import { ImportChart } from "@/components/ImportChart";
import { Card, SectionBlock } from "@/components/ui";
import { UnitPriceChart } from "@/components/UnitPriceChart";
import { formatMonth, formatSignedPercent, formatUsd } from "@/lib/format";
import type { ImportSummary } from "@/lib/metrics";

/** F3 수입 동향 (관세청) */
export function ImportSection({ hs, summary }: { hs: string; summary: ImportSummary }) {
  const recentUsd = summary.series.slice(-12).reduce((sum, m) => sum + m.usd, 0);
  const latest = summary.series[summary.series.length - 1];
  const top = summary.topCountries[0];

  return (
    <SectionBlock
      title={`수입 동향 · HS ${hs}`}
      source={`출처: 관세청 품목별 국가별 수출입실적 (공공데이터포털) · 기준 ${formatMonth(summary.asOf)} · 수입 금액은 과세가격 기준`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="최근 12개월 수입액" value={formatUsd(recentUsd)} />
        <Card label="수입 증가율 (전년 대비)" value={formatSignedPercent(summary.yoy)} />
        <Card
          label={`kg당 단가 (${formatMonth(latest.month)})`}
          value={latest.unitPrice === null ? "—" : `$${latest.unitPrice.toFixed(2)}`}
        />
        <Card label="1위 수입국" value={top ? `${top.name} ${top.share.toFixed(0)}%` : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ImportChart series={summary.series} />
        <UnitPriceChart series={summary.series} />
      </div>
      <CountryShareTable shares={summary.topCountries} />

      <details className="rounded-xl border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium">수입 데이터 표로 보기</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full tabular-nums">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 pr-4 font-normal">월</th>
                <th className="py-1 pr-4 text-right font-normal">수입액 (USD)</th>
                <th className="py-1 pr-4 text-right font-normal">중량 (kg)</th>
                <th className="py-1 text-right font-normal">단가 (USD/kg)</th>
              </tr>
            </thead>
            <tbody>
              {summary.series.map((m) => (
                <tr key={m.month} className="border-t border-border">
                  <td className="py-1 pr-4">{formatMonth(m.month)}</td>
                  <td className="py-1 pr-4 text-right">{m.usd.toLocaleString("ko-KR")}</td>
                  <td className="py-1 pr-4 text-right">{m.kg.toLocaleString("ko-KR")}</td>
                  <td className="py-1 text-right">{m.unitPrice?.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </SectionBlock>
  );
}
