"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnalysisResults, type AnalyzeResult } from "@/components/AnalysisResults";
import { ClassificationPicker } from "@/components/ClassificationPicker";
import { ManualQueryForm } from "@/components/ManualQueryForm";
import { ErrorBox, SectionSkeleton } from "@/components/ui";
import type { ProductClassification } from "@/lib/ai/classify";
import type { ErrorCode } from "@/lib/errors";
import { isHsCode, normalizeHsInput } from "@/lib/hs/code";
import { isMarketCategory, type MarketCategoryCode } from "@/lib/kosis/categories";
import { writeUrlState, type UrlState } from "@/lib/urlState";

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

/** 공유 링크(?q=&category=&hs=)에서 읽어 서버가 검증한 초기값 — page.tsx가 넘긴다 */
export function AnalyzeExplorer({ initial }: { initial: UrlState }) {
  const initialQuery: Query = { category: initial.category, hs: initial.hs };
  // 상품군·HS코드가 있으면 AI 분류 없이 바로 분석(한도 절약), 상품명만 있으면 분류부터
  const startsWithAnalysis = Boolean(initial.category || initial.hs);
  const startsWithClassify = !startsWithAnalysis && Boolean(initial.product);

  const [product, setProduct] = useState(initial.product);
  const [category, setCategory] = useState<MarketCategoryCode | "">(initial.category);
  const [hs, setHs] = useState(initial.hs);
  const [classify, setClassify] = useState<ClassifyState>(
    startsWithClassify ? { status: "loading", product: initial.product } : { status: "idle" },
  );
  const [analysis, setAnalysis] = useState<AnalyzeState>(
    startsWithAnalysis ? { status: "loading", query: initialQuery } : { status: "idle" },
  );
  // 마지막 요청 번호 (분류·분석 공용). 늦게 도착한 이전 응답이 최신 결과를 덮어쓰지 않게 한다.
  const latestRequest = useRef(0);
  const busy = classify.status === "loading" || analysis.status === "loading";

  /** 분석 요청만 (로딩 표시는 호출한 쪽이 이미 해 둠). 상태는 응답이 온 뒤에만 바꾼다. */
  async function requestAnalysis(query: Query, productName: string, requestId: number) {
    // 공유 링크: 지금 보고 있는 조합을 URL에 (뒤로 가기 기록은 늘리지 않음)
    window.history.replaceState(null, "", `${window.location.pathname}${writeUrlState({ product: productName, ...query })}`);
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.hs) params.set("hs", query.hs);

    let next: AnalyzeState;
    try {
      const response = await fetch(`/api/analyze?${params}`);
      const body: AnalyzeResponse = await response.json();
      next = body.ok
        ? { status: "done", result: body }
        : {
            status: "error",
            error: body.error,
            // 형식 검사는 화면에서 통과했으니, 서버의 INVALID_INPUT은 코드표에 없는 HS코드
            message:
              body.error === "INVALID_INPUT" && query.hs
                ? "코드표에 없는 HS코드예요. 6자리 소호나 10자리 HSK 코드를 입력해 주세요"
                : undefined,
          };
    } catch {
      next = { status: "error", error: "UPSTREAM_ERROR" };
    }
    if (requestId === latestRequest.current) setAnalysis(next);
  }

  /** productName: URL에 함께 남길 상품명 (분류 직후엔 state가 아직 갱신 전이라 직접 넘긴다) */
  function analyze(query: Query, productName = product) {
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
    setAnalysis({ status: "loading", query });
    requestAnalysis(query, productName, ++latestRequest.current);
  }

  /** 분류 요청만 → 끝나면 1순위 후보로 분석. 상태는 응답이 온 뒤에만 바꾼다. */
  async function requestClassification(name: string, requestId: number) {
    let body: ClassifyResponse;
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: name }),
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
      analyze(query, name);
    } else {
      setCategory("");
      setHs("");
    }
  }

  /** 상품명 → 분류 → 1순위 후보로 바로 분석 */
  function classifyAndAnalyze(name: string) {
    const trimmed = name.trim();
    setProduct(name);
    if (!trimmed) {
      setAnalysis({ status: "error", error: "INVALID_INPUT", message: "팔려는 상품명을 입력해 주세요" });
      return;
    }
    setClassify({ status: "loading", product: trimmed });
    setAnalysis({ status: "idle" });
    requestClassification(trimmed, ++latestRequest.current);
  }

  // 공유 링크로 열었을 때: 로딩 상태는 초기값으로 이미 잡혀 있고, 여기선 요청만 시작한다
  useEffect(() => {
    if (startsWithAnalysis) requestAnalysis(initialQuery, initial.product, ++latestRequest.current);
    else if (startsWithClassify) requestClassification(initial.product, ++latestRequest.current);
    // 처음 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    classifyAndAnalyze(product);
  }

  function onManualSubmit() {
    setClassify({ status: "idle" });
    // 직접 지정은 입력칸의 상품명과 무관한 조합일 수 있어 공유 링크에 상품명을 남기지 않는다
    analyze({ category, hs: normalizeHsInput(hs) }, "");
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
