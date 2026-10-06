import type { ReactNode } from "react";
import { ERROR_MESSAGES, type ErrorCode } from "@/lib/errors";

/** 요약 카드 */
export function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** 섹션·요청 실패 표시 (사용자 메시지만, 원인은 서버 로그). message가 있으면 코드 기본 문구 대신 사용. */
export function ErrorBox({ code, title, message }: { code: ErrorCode; title?: string; message?: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-surface p-4 text-sm text-danger">
      {title && <span className="font-semibold">{title}: </span>}
      {message ?? ERROR_MESSAGES[code]}
    </p>
  );
}

/** 섹션 제목 + 출처 줄을 가진 묶음 */
export function SectionBlock({ title, source, children }: { title: string; source?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      {source && <p className="text-xs text-muted">{source}</p>}
    </section>
  );
}

/** 섹션 로딩 자리 (카드 cards개 + 차트 charts개) */
export function SectionSkeleton({ cards, charts }: { cards: number; charts: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-6 w-40 rounded bg-grid" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-20 rounded-xl bg-grid" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: charts }, (_, i) => (
          <div key={i} className="h-72 rounded-xl bg-grid" />
        ))}
      </div>
    </div>
  );
}
