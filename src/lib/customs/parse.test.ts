import { describe, expect, it } from "vitest";
import { UpstreamError } from "@/lib/errors";
import { parseTradeXml } from "./parse";

// 2026-10-06 실제 응답에서 발췌 (hsSgn=8518309000, cntyCd=CN, 202608)
const SINGLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>00</resultCode><resultMsg>정상서비스.</resultMsg></header><body><items><item><balPayments>-16682858</balPayments><expDlr>50463</expDlr><expWgt>539</expWgt><hsCd>-</hsCd><impDlr>16733321</impDlr><impWgt>191224</impWgt><statCd>-</statCd><statCdCntnKor1>-</statCdCntnKor1><statKor>-</statKor><year>총계</year></item><item><balPayments>-16682858</balPayments><expDlr>50463</expDlr><expWgt>539</expWgt><hsCd>8518309000</hsCd><impDlr>16733321</impDlr><impWgt>191224</impWgt><statCd>CN</statCd><statCdCntnKor1>중국</statCdCntnKor1><statKor>기타</statKor><year>2026.08</year></item></items></body></response>`;

const MULTI = `<response><header><resultCode>00</resultCode><resultMsg>정상서비스.</resultMsg></header><body><items>
<item><expDlr>0</expDlr><expWgt>0</expWgt><hsCd>-</hsCd><impDlr>100</impDlr><impWgt>10</impWgt><statCd>-</statCd><statCdCntnKor1>-</statCdCntnKor1><statKor>-</statKor><year>총계</year></item>
<item><expDlr>5</expDlr><expWgt>1</expWgt><hsCd>0101211000</hsCd><impDlr>60</impDlr><impWgt>6</impWgt><statCd>US</statCd><statCdCntnKor1>미국</statCdCntnKor1><statKor>농가 사육용</statKor><year>2026.07</year></item>
<item><expDlr>0</expDlr><expWgt>0</expWgt><hsCd>0101211000</hsCd><impDlr>40</impDlr><impWgt>4</impWgt><statCd>JP</statCd><statCdCntnKor1>일본</statCdCntnKor1><statKor>농가 사육용</statKor><year>2026.08</year></item>
</items></body></response>`;

const EMPTY = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>00</resultCode><resultMsg>정상서비스.</resultMsg></header><body><items/></body></response>`;

const PERIOD_ERROR = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>99</resultCode><resultMsg>시작과 종료의 조회기간은 1년이내 기간만 가능합니다.</resultMsg></header><body/></response>`;

const KEY_ERROR = `<?xml version="1.0" encoding="UTF-8"?>
<OpenAPI_ServiceResponse>
<cmmMsgHeader>
  <errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg>
  <returnAuthMsg>등록되지 않은 서비스키</returnAuthMsg>
  <returnReasonCode>30</returnReasonCode>
</cmmMsgHeader>
</OpenAPI_ServiceResponse>`;

const RATE_ERROR = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</returnAuthMsg><returnReasonCode>22</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof UpstreamError ? error.code : "NOT_UPSTREAM";
  }
  return "NO_THROW";
}

describe("parseTradeXml", () => {
  it("결과가 1건(총계 + 1행)이어도 배열로 정규화하고 총계 행은 뺀다", () => {
    expect(parseTradeXml(SINGLE)).toEqual([
      {
        month: "202608",
        hsCode: "8518309000",
        countryCode: "CN",
        countryName: "중국",
        importUsd: 16733321,
        importKg: 191224,
        exportUsd: 50463,
        exportKg: 539,
      },
    ]);
  });

  it("여러 건을 파싱하고 HS코드 앞자리 0을 보존한다", () => {
    const rows = parseTradeXml(MULTI);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.hsCode)).toEqual(["0101211000", "0101211000"]);
    expect(rows.map((r) => r.month)).toEqual(["202607", "202608"]);
    expect(rows[1]).toMatchObject({ countryCode: "JP", importUsd: 40, importKg: 4 });
  });

  it("빈 items는 빈 배열", () => {
    expect(parseTradeXml(EMPTY)).toEqual([]);
  });

  it("resultCode가 00이 아니면 UPSTREAM_ERROR", () => {
    expect(codeOf(() => parseTradeXml(PERIOD_ERROR))).toBe("UPSTREAM_ERROR");
  });

  it("등록되지 않은 서비스키는 UPSTREAM_AUTH", () => {
    expect(codeOf(() => parseTradeXml(KEY_ERROR))).toBe("UPSTREAM_AUTH");
  });

  it("요청 한도 초과는 UPSTREAM_RATE_LIMIT", () => {
    expect(codeOf(() => parseTradeXml(RATE_ERROR))).toBe("UPSTREAM_RATE_LIMIT");
  });

  it("XML이 아니면 UPSTREAM_ERROR", () => {
    expect(codeOf(() => parseTradeXml("<html>Bad Gateway</html>"))).toBe("UPSTREAM_ERROR");
  });
});
