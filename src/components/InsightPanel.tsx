"use client";

import { useState } from "react";
import { ErrorBox, SourceNote } from "@/components/ui";
import type { Insight } from "@/lib/ai/insight";
import { METRIC_LABELS } from "@/lib/ai/insightMetrics";
import type { ErrorCode } from "@/lib/errors";
import type { MarketCategoryCode } from "@/lib/kosis/categories";
import { SOURCES } from "@/lib/sources";

type InsightResponse = { ok: true; data: Insight; cached: boolean } | { ok: false; error: ErrorCode };

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ErrorCode }
  | { status: "done"; insight: Insight };

/**
 * F4 AI 코멘트. 버튼을 눌렀을 때만 호출 (무료 한도 절약).
 * 문장 속 수치와 근거 칩 값은 AI가 쓴 것이 아니라 서버가 공공데이터로 채운 값.
 * 상품군·HS가 바뀌면 부모가 key를 바꿔 새로 마운트한다.
 */
export function InsightPanel({ category, hs }: { category: MarketCategoryCode; hs: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function load() {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, hs }),
      });
      const body: InsightResponse = await response.json();
      setState(body.ok ? { status: "done", insight: body.data } : { status: "error", error: body.error });
    } catch {
      setState({ status: "error", error: "UPSTREAM_ERROR" });
    }
  }

  return (
    <section aria-label="AI 코멘트" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">AI 코멘트</h2>
        {state.status !== "done" && (
          <button
            type="button"
            onClick={load}
            disabled={state.status === "loading"}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {state.status === "loading" ? "생성 중…" : state.status === "error" ? "다시 시도" : "코멘트 받기"}
          </button>
        )}
      </div>

      {state.status === "idle" && (
        <p className="text-sm text-muted">위 시장·수입 데이터를 근거로 진입 관점의 코멘트를 만들어요.</p>
      )}
      {state.status === "loading" && (
        <div className="flex animate-pulse flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 rounded bg-grid" />
          ))}
        </div>
      )}
      {state.status === "error" && <ErrorBox code={state.error} />}
      {state.status === "done" && (
        <>
          <ul className="flex flex-col gap-3">
            {state.insight.points.map((point) => (
              <li key={point.text} className="flex flex-col gap-1.5">
                <p className="break-words">• {point.text}</p>
                <div className="flex flex-wrap gap-1.5 pl-3">
                  {point.metrics.map((key) => (
                    <span key={key} className="rounded-full border border-border px-2 py-0.5 text-xs text-secondary">
                      {METRIC_LABELS[key]} <span className="tabular-nums text-foreground">{state.insight.metrics[key]}</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            AI가 쓴 문장이에요. 문장 속 수치는 AI가 아니라 공공데이터 값으로 채웠어요 (근거 칩 참고).
          </p>
          <SourceNote prefix="수치" sources={[SOURCES.kosis, SOURCES.customs]} note="문장: Google Gemini" />
        </>
      )}
    </section>
  );
}
