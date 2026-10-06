"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImportSection } from "@/components/ImportSection";
import { MarketSection } from "@/components/MarketSection";
import { ErrorBox, SectionSkeleton } from "@/components/ui";
import type { ErrorCode } from "@/lib/errors";
import { isHsCode, normalizeHsInput } from "@/lib/hs/code";
import { isMarketCategory, MARKET_CATEGORIES, type MarketCategoryCode } from "@/lib/kosis/categories";
import type { ImportSummary, MarketSummary } from "@/lib/metrics";
import type { Section } from "@/lib/section";

type AnalyzeResult = {
  ok: true;
  hs: string | null;
  category: MarketCategoryCode | null;
  market: Section<MarketSummary> | null;
  imports: Section<ImportSummary> | null;
};
type AnalyzeResponse = AnalyzeResult | { ok: false; error: ErrorCode };

type Query = { category: MarketCategoryCode | ""; hs: string };

// D4에서 상품명 → 상품군·HS코드 분류(F1)로 대체. 지금은 직접 선택 + 예시.
const EXAMPLES: { label: string; category: MarketCategoryCode; hs: string }[] = [
  { label: "무선 이어폰", category: "0021", hs: "851830" },
  { label: "완구", category: "011", hs: "950300" },
  { label: "기초화장품", category: "010", hs: "330499" },
];

type State =
  | { status: "idle" }
  | { status: "loading"; query: Query }
  | { status: "error"; error: ErrorCode; message?: string }
  | { status: "done"; result: AnalyzeResult };

export function AnalyzeExplorer() {
  const [category, setCategory] = useState<MarketCategoryCode | "">("");
  const [hs, setHs] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  // 마지막 요청 번호. 늦게 도착한 이전 응답이 최신 결과를 덮어쓰지 않게 한다.
  const latestRequest = useRef(0);
  const loading = state.status === "loading";

  async function analyze(query: Query) {
    setCategory(query.category);
    setHs(query.hs);
    if (!query.category && !query.hs) {
      setState({ status: "error", error: "INVALID_INPUT", message: "상품군이나 HS코드 중 하나 이상 입력해 주세요" });
      return;
    }
    if (query.hs && !isHsCode(query.hs)) {
      setState({ status: "error", error: "INVALID_INPUT", message: "HS코드는 숫자 6자리 또는 10자리예요 (예: 851830)" });
      return;
    }
    const requestId = ++latestRequest.current;
    setState({ status: "loading", query });

    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.hs) params.set("hs", query.hs);

    let next: State;
    try {
      const response = await fetch(`/api/analyze?${params}`);
      const body: AnalyzeResponse = await response.json();
      next = body.ok ? { status: "done", result: body } : { status: "error", error: body.error };
    } catch {
      next = { status: "error", error: "UPSTREAM_ERROR" };
    }
    if (requestId === latestRequest.current) setState(next);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    analyze({ category, hs: normalizeHsInput(hs) });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium">
            상품군 (온라인 시장)
            <select
              value={category}
              onChange={(e) => setCategory(isMarketCategory(e.target.value) ? e.target.value : "")}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-series-1"
            >
              <option value="">선택 안 함</option>
              {MARKET_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            HS코드 (수입 동향, 6·10자리)
            <input
              value={hs}
              onChange={(e) => setHs(e.target.value)}
              inputMode="numeric"
              placeholder="예: 851830"
              className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-series-1"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
          >
            분석
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">예시</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => analyze({ category: example.category, hs: example.hs })}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1 text-secondary hover:border-series-1 disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </form>

      {state.status === "loading" && (
        <>
          {state.query.category && <SectionSkeleton cards={3} charts={1} />}
          {state.query.hs && <SectionSkeleton cards={4} charts={2} />}
        </>
      )}
      {state.status === "error" && <ErrorBox code={state.error} message={state.message} />}
      {state.status === "done" && <Results result={state.result} />}
    </div>
  );
}

function Results({ result }: { result: AnalyzeResult }) {
  return (
    <>
      {result.category &&
        result.market &&
        (result.market.ok ? (
          <MarketSection category={result.category} summary={result.market.data} />
        ) : (
          <ErrorBox title="온라인 시장" code={result.market.error} />
        ))}
      {result.hs &&
        result.imports &&
        (result.imports.ok ? (
          <ImportSection hs={result.hs} summary={result.imports.data} />
        ) : (
          <ErrorBox title="수입 동향" code={result.imports.error} />
        ))}
    </>
  );
}
