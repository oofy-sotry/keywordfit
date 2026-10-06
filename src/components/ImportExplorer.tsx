"use client";

import { useState, type FormEvent } from "react";
import { CountryShareTable } from "@/components/CountryShareTable";
import { ImportChart } from "@/components/ImportChart";
import { UnitPriceChart } from "@/components/UnitPriceChart";
import { ERROR_MESSAGES, type ErrorCode } from "@/lib/errors";
import { formatMonth, formatSignedPercent, formatUsd } from "@/lib/format";
import type { ImportSummary } from "@/lib/metrics";
import type { Section } from "@/lib/section";

type AnalyzeResponse = { hs: string; imports: Section<ImportSummary> };

// D4에서 상품명 → HS코드 분류(F1)로 대체. 지금은 HS코드 직접 입력 + 예시.
const EXAMPLES = [
  { code: "851830", label: "헤드폰·이어폰" },
  { code: "950300", label: "완구" },
  { code: "330499", label: "기초화장품" },
];

type State =
  | { status: "idle" }
  | { status: "loading"; hs: string }
  | { status: "error"; error: ErrorCode }
  | { status: "done"; result: AnalyzeResponse };

export function ImportExplorer() {
  const [hs, setHs] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function analyze(code: string) {
    setHs(code);
    setState({ status: "loading", hs: code });
    try {
      const response = await fetch(`/api/analyze?hs=${encodeURIComponent(code)}`);
      const body = await response.json();
      if (!response.ok) {
        setState({ status: "error", error: body.error ?? "UPSTREAM_ERROR" });
        return;
      }
      setState({ status: "done", result: body });
    } catch {
      setState({ status: "error", error: "UPSTREAM_ERROR" });
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const code = hs.replace(/[.\-\s]/g, "");
    if (code) analyze(code);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="hs" className="text-sm font-medium">
          HS코드 (6자리 또는 10자리)
        </label>
        <div className="flex gap-2">
          <input
            id="hs"
            value={hs}
            onChange={(e) => setHs(e.target.value)}
            inputMode="numeric"
            placeholder="예: 851830"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-series-1"
          />
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            분석
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {EXAMPLES.map((example) => (
            <button
              key={example.code}
              type="button"
              onClick={() => analyze(example.code)}
              className="rounded-full border border-border px-3 py-1 text-secondary hover:border-series-1"
            >
              {example.label} <span className="text-muted">{example.code}</span>
            </button>
          ))}
        </div>
      </form>

      {state.status === "loading" && <Skeleton />}
      {state.status === "error" && <ErrorBox code={state.error} />}
      {state.status === "done" &&
        (state.result.imports.ok ? (
          <ImportResult hs={state.result.hs} summary={state.result.imports.data} />
        ) : (
          <ErrorBox code={state.result.imports.error} />
        ))}
    </div>
  );
}

function ImportResult({ hs, summary }: { hs: string; summary: ImportSummary }) {
  const recent = summary.series.slice(-12);
  const recentUsd = recent.reduce((sum, m) => sum + m.usd, 0);
  const latest = summary.series[summary.series.length - 1];
  const top = summary.topCountries[0];

  return (
    <section className="flex flex-col gap-4" aria-label={`HS ${hs} 수입 동향`}>
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
        <summary className="cursor-pointer font-medium">표로 보기</summary>
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

      <p className="text-xs text-muted">
        출처: 관세청 품목별 국가별 수출입실적 (공공데이터포털) · HS {hs} · 기준 {formatMonth(summary.asOf)} · 수입 금액은
        과세가격 기준
      </p>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ErrorBox({ code }: { code: ErrorCode }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-surface p-4 text-sm text-danger">
      {ERROR_MESSAGES[code]}
    </p>
  );
}

function Skeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="불러오는 중">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-grid" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-grid" />
        <div className="h-72 rounded-xl bg-grid" />
      </div>
    </div>
  );
}
