"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnalysisResults, type AnalyzeResult } from "@/components/AnalysisResults";
import { ClassificationPicker } from "@/components/ClassificationPicker";
import { ManualQueryForm } from "@/components/ManualQueryForm";
import { ErrorBox, SectionSkeleton } from "@/components/ui";
import type { ProductClassification } from "@/lib/ai/classify";
import type { ErrorCode } from "@/lib/errors";
import { isHsCode, normalizeHsInput } from "@/lib/hs/code";
import { isMarketCategory, type MarketCategoryCode } from "@/lib/kosis/categories";

type AnalyzeResponse = AnalyzeResult | { ok: false; error: ErrorCode };
type ClassifyResponse =
  | { ok: true; product: string; data: ProductClassification; cached: boolean }
  | { ok: false; error: ErrorCode };

type Query = { category: MarketCategoryCode | ""; hs: string };

const EXAMPLES = ["무선 블루투스 이어폰", "강아지 사료", "레고 블록"];

type ClassifyState =
  | { status: "idle" }
  | { status: "loading"; product: string }
  | { status: "done"; product: string; result: ProductClassification };

type AnalyzeState =
  | { status: "idle" }
  | { status: "loading"; query: Query }
  | { status: "error"; error: ErrorCode; message?: string }
  | { status: "done"; result: AnalyzeResult };

export function AnalyzeExplorer() {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState<MarketCategoryCode | "">("");
  const [hs, setHs] = useState("");
  const [classify, setClassify] = useState<ClassifyState>({ status: "idle" });
  const [analysis, setAnalysis] = useState<AnalyzeState>({ status: "idle" });
  // 마지막 요청 번호 (분류·분석 공용). 늦게 도착한 이전 응답이 최신 결과를 덮어쓰지 않게 한다.
  const latestRequest = useRef(0);
  const busy = classify.status === "loading" || analysis.status === "loading";

  async function analyze(query: Query) {
    setCategory(query.category);
    setHs(query.hs);
    if (!query.category && !query.hs) {
      setAnalysis({ status: "error", error: "INVALID_INPUT", message: "상품군이나 HS코드 중 하나 이상 입력해 주세요" });
      return;
    }
    if (query.hs && !isHsCode(query.hs)) {
      setAnalysis({ status: "error", error: "INVALID_INPUT", message: "HS코드는 숫자 6자리 또는 10자리예요 (예: 851830)" });
      return;
    }
    const requestId = ++latestRequest.current;
    setAnalysis({ status: "loading", query });

    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.hs) params.set("hs", query.hs);

    let next: AnalyzeState;
    try {
      const response = await fetch(`/api/analyze?${params}`);
      const body: AnalyzeResponse = await response.json();
      next = body.ok ? { status: "done", result: body } : { status: "error", error: body.error };
    } catch {
      next = { status: "error", error: "UPSTREAM_ERROR" };
    }
    if (requestId === latestRequest.current) setAnalysis(next);
  }

  /** 상품명 → 분류 → 1순위 후보로 바로 분석 */
  async function classifyAndAnalyze(name: string) {
    const trimmed = name.trim();
    setProduct(name);
    if (!trimmed) {
      setAnalysis({ status: "error", error: "INVALID_INPUT", message: "팔려는 상품명을 입력해 주세요" });
      return;
    }
    const requestId = ++latestRequest.current;
    setClassify({ status: "loading", product: trimmed });
    setAnalysis({ status: "idle" });

    let body: ClassifyResponse;
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: trimmed }),
      });
      body = await response.json();
    } catch {
      body = { ok: false, error: "UPSTREAM_ERROR" };
    }
    if (requestId !== latestRequest.current) return;

    if (!body.ok) {
      setClassify({ status: "idle" });
      setAnalysis({ status: "error", error: body.error });
      return;
    }
    setClassify({ status: "done", product: body.product, result: body.data });
    const first = body.data.hsCandidates[0]?.code ?? "";
    const suggested = body.data.category?.code ?? "";
    const query = { category: isMarketCategory(suggested) ? suggested : "", hs: first } as const;
    if (query.category || query.hs) {
      analyze(query);
    } else {
      setCategory("");
      setHs("");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    classifyAndAnalyze(product);
  }

  function onManualSubmit() {
    setClassify({ status: "idle" });
    analyze({ category, hs: normalizeHsInput(hs) });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor="product" className="text-sm font-medium">
            팔려는 상품
          </label>
          <div className="flex gap-2">
            <input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              maxLength={40}
              placeholder="예: 무선 블루투스 이어폰"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-series-1"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
            >
              분석
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">예시</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => classifyAndAnalyze(example)}
                disabled={busy}
                className="rounded-full border border-border px-3 py-1 text-secondary hover:border-series-1 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        <ManualQueryForm
          category={category}
          hs={hs}
          disabled={busy}
          onCategoryChange={setCategory}
          onHsChange={setHs}
          onSubmit={onManualSubmit}
        />
      </div>

      {classify.status === "loading" && (
        <p className="animate-pulse text-sm text-muted" aria-busy="true">
          “{classify.product}” 분류 중…
        </p>
      )}
      {classify.status === "done" && (
        <ClassificationPicker
          product={classify.product}
          result={classify.result}
          category={category}
          hs={hs}
          disabled={busy}
          onChange={analyze}
        />
      )}

      {analysis.status === "loading" && (
        <>
          {analysis.query.category && <SectionSkeleton cards={3} charts={1} />}
          {analysis.query.hs && <SectionSkeleton cards={4} charts={2} />}
        </>
      )}
      {analysis.status === "error" && <ErrorBox code={analysis.error} message={analysis.message} />}
      {analysis.status === "done" && <AnalysisResults result={analysis.result} />}
    </div>
  );
}
