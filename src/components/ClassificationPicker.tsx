import type { ProductClassification } from "@/lib/ai/classify";
import { isMarketCategory, MARKET_CATEGORIES, type MarketCategoryCode } from "@/lib/kosis/categories";

type Props = {
  product: string;
  result: ProductClassification;
  category: MarketCategoryCode | "";
  hs: string;
  disabled: boolean;
  onChange: (next: { category: MarketCategoryCode | ""; hs: string }) => void;
};

/** F1 분류 결과: 상품군(수정 가능) + HS 후보 선택. 품명은 AI가 아니라 코드표 값. */
export function ClassificationPicker({ product, result, category, hs, disabled, onChange }: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4" aria-label="분류 결과">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">“{product}”</span>
        <span className="text-muted">{result.source === "ai" ? "AI 분류 (코드표로 검증)" : "품명 검색 결과"}</span>
      </div>

      {result.warnings.length > 0 && (
        <ul className="text-xs text-muted">
          {result.warnings.map((warning) => (
            <li key={warning}>※ {warning}</li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium sm:max-w-xs">
        상품군 (온라인 시장)
        <select
          value={category}
          disabled={disabled}
          onChange={(e) => onChange({ category: isMarketCategory(e.target.value) ? e.target.value : "", hs })}
          className="rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-series-1"
        >
          <option value="">선택 안 함</option>
          {MARKET_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* fieldset은 기본이 min-inline-size: min-content라, 한 줄로 자르는 긴 품명이 상자 폭을 밀어낸다 → min-w-0 */}
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">HS코드 후보 (수입 동향)</legend>
        {result.hsCandidates.length === 0 && (
          <p className="text-sm text-muted">후보를 찾지 못했어요. 아래 “직접 지정”에서 HS코드를 입력해 주세요.</p>
        )}
        {result.hsCandidates.map((candidate) => (
          <label
            key={candidate.code}
            className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm ${
              hs === candidate.code ? "border-series-1" : "border-border"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              name="hs-candidate"
              value={candidate.code}
              checked={hs === candidate.code}
              disabled={disabled}
              onChange={() => onChange({ category, hs: candidate.code })}
              className="mt-1 accent-series-1"
            />
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 break-words" title={candidate.label}>
                <span className="font-mono tabular-nums">{candidate.code}</span> · {candidate.label}
              </span>
              <span className="truncate text-xs text-muted" title={candidate.heading}>
                {candidate.heading}
              </span>
              {result.source === "ai" && <span className="text-xs text-secondary">{candidate.reason}</span>}
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
