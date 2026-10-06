/**
 * KOSIS 온라인쇼핑동향(DT_1KE10041) 상품군 코드 — 재화만 (서비스 018~022 제외).
 * 2026-10-06 실제 응답 기준. 하위 분류가 있는 002는 세부 코드(0021/0022)를 쓴다.
 * 서버·클라이언트 공용.
 */
export const MARKET_CATEGORIES = [
  { code: "001", name: "컴퓨터 및 주변기기" },
  { code: "0021", name: "가전·전자" },
  { code: "0022", name: "통신기기" },
  { code: "003", name: "서적" },
  { code: "004", name: "사무·문구" },
  { code: "005", name: "의복" },
  { code: "006", name: "신발" },
  { code: "007", name: "가방" },
  { code: "008", name: "패션용품 및 액세서리" },
  { code: "009", name: "스포츠·레저용품" },
  { code: "010", name: "화장품" },
  { code: "011", name: "아동·유아용품" },
  { code: "012", name: "음·식료품" },
  { code: "013", name: "농축수산물" },
  { code: "014", name: "생활용품" },
  { code: "015", name: "자동차 및 자동차용품" },
  { code: "016", name: "가구" },
  { code: "017", name: "애완용품" },
  { code: "023", name: "기타" },
] as const;

export type MarketCategoryCode = (typeof MARKET_CATEGORIES)[number]["code"];

export function isMarketCategory(code: string): code is MarketCategoryCode {
  return MARKET_CATEGORIES.some((category) => category.code === code);
}

export function categoryName(code: MarketCategoryCode): string {
  return MARKET_CATEGORIES.find((category) => category.code === code)!.name;
}
