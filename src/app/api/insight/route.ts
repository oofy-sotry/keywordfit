import { z } from "zod";
import { getInsight } from "@/lib/ai/insight";
import { clientKey } from "@/lib/clientKey";
import { httpStatusOf, toErrorCode } from "@/lib/errors";
import { HS_CODE_PATTERN, normalizeHsInput } from "@/lib/hs/code";
import { isMarketCategory } from "@/lib/kosis/categories";

const Body = z.object({
  category: z.string().refine(isMarketCategory),
  hs: z.string().transform(normalizeHsInput).pipe(z.string().regex(HS_CODE_PATTERN)),
});

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  try {
    const { data, cached } = await getInsight(body.data.category, body.data.hs, clientKey(request.headers));
    return Response.json({ ok: true, data, cached });
  } catch (error) {
    const code = toErrorCode(error);
    if (code !== "NO_DATA" && code !== "AI_LIMIT") console.error("[insight]", error);
    return Response.json({ ok: false, error: code }, { status: httpStatusOf(code) });
  }
}
