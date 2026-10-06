import type { NextRequest } from "next/server";
import { z } from "zod";
import { getImportSummary } from "@/lib/customs/imports";
import { HS_CODE_PATTERN, normalizeHsInput } from "@/lib/hs/code";
import { toSection } from "@/lib/section";

const Query = z.object({
  hs: z.string().transform(normalizeHsInput).pipe(z.string().regex(HS_CODE_PATTERN)),
});

export async function GET(request: NextRequest) {
  const query = Query.safeParse({ hs: request.nextUrl.searchParams.get("hs") ?? "" });
  if (!query.success) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  // D3에서 market 섹션 추가 후 Promise.all로 병렬화, D3 캐시 도입 전까지 cached는 항상 false
  const imports = await toSection("imports", async () => ({
    data: await getImportSummary(query.data.hs),
    cached: false,
  }));

  return Response.json({ hs: query.data.hs, imports });
}
