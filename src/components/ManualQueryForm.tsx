import type { FormEvent } from "react";
import { isMarketCategory, MARKET_CATEGORIES, type MarketCategoryCode } from "@/lib/kosis/categories";

type Props = {
  category: MarketCategoryCode | "";
  hs: string;
  disabled: boolean;
  onCategoryChange: (category: MarketCategoryCode | "") => void;
  onHsChange: (hs: string) => void;
  onSubmit: () => void;
};

/** 상품군·HS코드 직접 지정 (AI 분류 없이 바로 조회). 값은 부모가 가진다 — 분류 결과 선택과 같은 상태를 공유. */
export function ManualQueryForm({ category, hs, disabled, onCategoryChange, onHsChange, onSubmit }: Props) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-secondary">상품군·HS코드 직접 지정</summary>
      <form
        onSubmit={handleSubmit}
        className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1 font-medium">
          상품군
          <select
            value={category}
            onChange={(e) => onCategoryChange(isMarketCategory(e.target.value) ? e.target.value : "")}
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
        <label className="flex flex-col gap-1 font-medium">
          HS코드 (6·10자리)
          <input
            value={hs}
            onChange={(e) => onHsChange(e.target.value)}
            inputMode="numeric"
            placeholder="예: 851830"
            className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-series-1"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg border border-border px-4 py-2 font-medium disabled:opacity-50"
        >
          조회
        </button>
      </form>
    </details>
  );
}
