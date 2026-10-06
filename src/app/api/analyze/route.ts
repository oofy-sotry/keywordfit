import type { NextRequest } from "next/server";
import { z } from "zod";
import { getImportSummary } from "@/lib/customs/imports";
import { HS_CODE_PATTERN, normalizeHsInput } from "@/lib/hs/code";
import { hsIndex } from "@/lib/hs/hsIndex";
import { isMarketCategory } from "@/lib/kosis/categories";
import { getMarketSummary } from "@/lib/kosis/market";
import { toOpportunitySection } from "@/lib/opportunity";
import { toSection } from "@/lib/section";

const Query = z
  .object({
    // 형식 + 코드표 존재 확인 (관세청은 특수용도 코드 999999 등에도 데이터를 줌)
    hs: z.string().transform(normalizeHsInput).pipe(z.string().regex(HS_CODE_PATTERN).refine(hsIndex.exists)).optional(),
    category: z.string().refine(isMarketCategory).optional(),
  })
  .refine((q) => q.hs || q.category, "hs 또는 category 중 하나는 필요");

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = Query.safeParse({
    hs: params.get("hs") || undefined,
    category: params.get("category") || undefined,
  });
  if (!query.success) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const { hs, category } = query.data;

  // 섹션별 실패 격리: 한쪽이 실패해도 다른 쪽은 그대로 (요청하지 않은 섹션은 null)
  const [market, imports] = await Promise.all([
    category ? toSection("market", () => getMarketSummary(category)) : null,
    hs ? toSection("imports", () => getImportSummary(hs)) : null,
  ]);

  const opportunity = toOpportunitySection(market, imports);

  return Response.json({ ok: true, hs: hs ?? null, category: category ?? null, market, imports, opportunity });
}
