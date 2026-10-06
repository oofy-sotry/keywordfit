import type { Hs6 } from "@/lib/hs/hsCodes";
import { normalizeHsInput } from "@/lib/hs/code";

/** AI 분류 출력 (스키마 검증을 통과한 형태) */
export type RawClassification = {
  categoryCode: string;
  hsCandidates: { code: string; reason: string }[];
};

export type HsCandidate = Hs6 & { reason: string };

export type Classification = {
  category: { code: string; name: string } | null;
  hsCandidates: HsCandidate[];
  warnings: string[];
};

type Deps = {
  categoryName: (code: string) => string | null;
  describe6: (code: string) => Hs6 | null;
};

const MAX_CANDIDATES = 3;
const MAX_REASON = 100;

/**
 * AI 분류 결과를 그대로 믿지 않는다 (design.md §6.2).
 * 코드표에 실제로 있는 HS코드·목록에 있는 상품군만 남기고, 품명은 AI가 아니라 코드표 값으로 채운다.
 */
export function validateClassification(raw: RawClassification, deps: Deps): Classification {
  const warnings: string[] = [];

  const name = deps.categoryName(raw.categoryCode);
  if (!name) warnings.push(`목록에 없는 상품군 제외: ${raw.categoryCode}`);
  const category = name ? { code: raw.categoryCode, name } : null;

  const seen = new Set<string>();
  const hsCandidates: HsCandidate[] = [];
  for (const candidate of raw.hsCandidates) {
    const normalized = normalizeHsInput(candidate.code);
    if (!/^(\d{6}|\d{10})$/.test(normalized)) {
      warnings.push(`형식이 틀린 HS코드 제외: ${candidate.code}`);
      continue;
    }
    const code6 = normalized.slice(0, 6); // 10자리면 6자리 소호로 올려서 조회·표시
    const info = deps.describe6(code6);
    if (!info) {
      warnings.push(`코드표에 없는 HS코드 제외: ${candidate.code}`);
      continue;
    }
    if (seen.has(code6) || hsCandidates.length >= MAX_CANDIDATES) continue;
    seen.add(code6);
    hsCandidates.push({ ...info, reason: candidate.reason.trim().slice(0, MAX_REASON) });
  }

  return { category, hsCandidates, warnings };
}
