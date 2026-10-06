import type { Hs6 } from "@/lib/hs/hsCodes";
import { normalizeHsInput } from "@/lib/hs/code";
import { isMetricKey, type InsightMetrics, type MetricKey } from "./insightMetrics";

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

/** AI 코멘트 출력 (스키마 검증을 통과한 형태). 근거 판정은 문장 속 자리표시자로 하므로 별도 metrics 필드는 받지 않는다. */
export type RawInsight = { points: { text: string }[] };

/** 자리표시자가 남은 문장 틀 — 이 형태로 캐시하고, 값은 요청할 때마다 채운다. */
export type InsightTemplate = { text: string; metrics: MetricKey[] };
export type InsightPoint = { text: string; metrics: MetricKey[] };

const MAX_POINTS = 4;
const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/**
 * AI 코멘트를 그대로 믿지 않는다 (design.md §6.3).
 * 수치는 AI가 쓰지 않고 {{key}} 자리표시자로만 참조 → 서버가 우리 데이터 값으로 채운다.
 * 자리표시자 밖에 숫자가 있으면 AI가 수치를 지어낸 것으로 보고 그 문장을 버린다.
 */
export function validateInsight(
  raw: RawInsight,
  metrics: InsightMetrics,
): { templates: InsightTemplate[]; warnings: string[] } {
  const warnings: string[] = [];
  const templates: InsightTemplate[] = [];
  const seen = new Set<string>();

  for (const { text: rawText } of raw.points) {
    const text = rawText.trim();
    const keys = [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))];
    if (keys.length === 0) {
      warnings.push(`근거 지표 없는 문장 제외: ${text}`);
      continue;
    }
    const unknown = keys.filter((key) => !isMetricKey(key));
    if (unknown.length > 0) {
      warnings.push(`모르는 지표 사용 제외: ${unknown.join(", ")}`);
      continue;
    }
    const missing = (keys as MetricKey[]).filter((key) => metrics[key] === null);
    if (missing.length > 0) {
      warnings.push(`값이 없는 지표 사용 제외: ${missing.join(", ")}`);
      continue;
    }
    if (/\d/.test(text.replace(PLACEHOLDER, ""))) {
      warnings.push(`자리표시자 밖 숫자 제외: ${text}`);
      continue;
    }
    if (seen.has(text) || templates.length >= MAX_POINTS) continue;
    seen.add(text);
    templates.push({ text, metrics: keys as MetricKey[] });
  }
  return { templates, warnings };
}

/** 문장 틀을 지금의 우리 데이터로 채운다. 그사이 값이 없어진 지표를 쓰는 문장은 뺀다. */
export function fillInsight(templates: InsightTemplate[], metrics: InsightMetrics): InsightPoint[] {
  return templates
    .filter((template) => template.metrics.every((key) => metrics[key] !== null))
    .map((template) => ({
      text: template.text.replace(PLACEHOLDER, (_, key: MetricKey) => metrics[key]!),
      metrics: template.metrics,
    }));
}
