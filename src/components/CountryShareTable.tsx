import { SourceNote } from "@/components/ui";
import type { CountryShare } from "@/lib/metrics";
import { SOURCES } from "@/lib/sources";

/** 최근 12개월 수입국 점유율. 막대는 보조, 수치는 텍스트로 항상 표시. */
export function CountryShareTable({ shares }: { shares: CountryShare[] }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold">주요 수입국 (최근 12개월 수입액 기준)</figcaption>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>국가</th>
            <th>점유율</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((country) => (
            <tr key={country.name} className="border-t border-border first:border-t-0">
              <td className="w-24 py-2 pr-3">{country.name}</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-grid">
                    <div
                      className={`h-2 rounded-full ${country.name === "기타" ? "bg-muted" : "bg-series-1"}`}
                      style={{ width: `${country.share}%` }}
                    />
                  </div>
                  <span className="w-14 text-right tabular-nums text-secondary">{country.share.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">
        <SourceNote sources={[SOURCES.customs]} />
      </div>
    </figure>
  );
}
