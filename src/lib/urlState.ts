import { isHsCode, normalizeHsInput } from "@/lib/hs/code";
import { isMarketCategory, type MarketCategoryCode } from "@/lib/kosis/categories";

/** 공유 링크용 URL 상태: ?q=상품명&category=상품군&hs=HS코드 (클라이언트·서버 공용, 순수) */
export type UrlState = { product: string; category: MarketCategoryCode | ""; hs: string };

const MAX_PRODUCT = 40;

/** URL은 누구나 고칠 수 있으므로 값마다 검증하고, 틀린 값은 버린다. */
export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const category = params.get("category") ?? "";
  const hs = normalizeHsInput(params.get("hs") ?? "");
  return {
    product: (params.get("q") ?? "").trim().slice(0, MAX_PRODUCT),
    category: isMarketCategory(category) ? category : "",
    hs: isHsCode(hs) ? hs : "",
  };
}

export function writeUrlState({ product, category, hs }: UrlState): string {
  const params = new URLSearchParams();
  if (product.trim()) params.set("q", product.trim());
  if (category) params.set("category", category);
  if (hs) params.set("hs", hs);
  const query = params.toString();
  return query ? `?${query}` : "";
}
