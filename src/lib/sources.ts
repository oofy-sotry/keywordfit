/** 화면 출처 표기용 원본 데이터 (이름 + 원본 페이지). 항목마다 작게 표시해 근거를 바로 확인할 수 있게 한다. */
export type DataSource = { name: string; url: string };

export const SOURCES = {
  kosis: {
    name: "통계청 KOSIS 온라인쇼핑동향",
    url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1KE10041",
  },
  customs: {
    name: "관세청 품목별 국가별 수출입실적",
    url: "https://www.data.go.kr/data/15100475/openapi.do",
  },
  hsCodes: {
    name: "관세청 HS부호",
    url: "https://www.data.go.kr/data/15049722/fileData.do",
  },
} as const satisfies Record<string, DataSource>;
