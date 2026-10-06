import { z } from "zod";
import { classifyProduct } from "@/lib/ai/classify";

const Body = z.object({
  product: z.string().trim().min(1).max(40),
});

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const { data, cached } = await classifyProduct(body.data.product);
  return Response.json({ ok: true, product: body.data.product, data, cached });
}
