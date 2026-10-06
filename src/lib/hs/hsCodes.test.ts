import { describe, expect, it } from "vitest";
import type { HsData } from "./build";
import { createHsIndex } from "./hsCodes";

const data: HsData = {
  units4: {
    "0101": "살아 있는 말ㆍ당나귀ㆍ노새ㆍ버새",
    "8517": "전화기(셀룰러 통신망용이나 그 밖의 무선통신망용의 스마트폰을 포함한다)",
    "8518": "마이크로폰과 그 스탠드, 확성기, 헤드폰과 이어폰",
    "9503": "세발자전거ㆍ스쿠터ㆍ페달 자동차와 이와 유사한 바퀴가 달린 완구, 인형",
  },
  units5: { "01012": "말" },
  units6: {
    "010121": "번식용",
    "851830": "헤드폰과 이어폰(마이크로폰이 부착된 것인지에 상관없다)",
  },
  codes10: {
    "8517110000": "무선 송수화기를 갖춘 유선전화기",
    "0101211000": "농가 사육용",
    "0101300000": "당나귀",
    "0101900000": "기타",
    "8518304000": "유선전화 핸드세트",
    "8518309000": "기타",
    "9503001000": "세발자전거ㆍ스쿠터",
    "9503009000": "기타",
  },
};
const index = createHsIndex(data);

describe("exists", () => {
  it("유효한 6자리·10자리만 true", () => {
    expect(index.exists("851830")).toBe(true);
    expect(index.exists("8518309000")).toBe(true);
    expect(index.exists("851831")).toBe(false);
    expect(index.exists("8518300000")).toBe(false);
    expect(index.exists("8518")).toBe(false);
  });
});

describe("describe6", () => {
  it("6자리 이름이 있으면 그 이름, 5자리 상위가 있으면 함께", () => {
    expect(index.describe6("851830")?.label).toBe("헤드폰과 이어폰(마이크로폰이 부착된 것인지에 상관없다)");
    expect(index.describe6("010121")?.label).toBe("말 > 번식용");
  });

  it("6자리·5자리 이름이 없으면 하위 …0000 코드 이름", () => {
    expect(index.describe6("010130")?.label).toBe("당나귀");
  });

  it("아무 이름도 없으면 '기타', 상위 4단위 이름을 heading으로", () => {
    expect(index.describe6("950300")).toEqual({
      code: "950300",
      label: "기타",
      heading: "세발자전거ㆍ스쿠터ㆍ페달 자동차와 이와 유사한 바퀴가 달린 완구, 인형",
    });
  });

  it("없는 코드는 null", () => {
    expect(index.describe6("999999")).toBeNull();
  });
});

describe("search", () => {
  it("띄어쓰기 단어가 이름에 들어 있는 6자리 코드를 찾는다", () => {
    expect(index.search("이어폰").map((r) => r.code)[0]).toBe("851830");
  });

  it("짧은 단어가 하위 품명 여러 곳에 걸려도, 더 긴 핵심 단어가 맞는 코드가 먼저", () => {
    expect(index.search("무선 이어폰").map((r) => r.code)[0]).toBe("851830");
  });

  it("붙여 쓴 입력도 글자 쌍(bigram)으로 찾는다", () => {
    expect(index.search("무선이어폰").map((r) => r.code)[0]).toBe("851830");
  });

  it("4단위·10단위 이름도 검색 대상", () => {
    expect(index.search("인형").map((r) => r.code)).toContain("950300");
    expect(index.search("당나귀").map((r) => r.code)[0]).toBe("010130");
  });

  it("관련 없는 입력은 빈 배열, 개수 제한", () => {
    expect(index.search("자동차보험료")).toEqual([]);
    expect(index.search("기타", 1)).toHaveLength(1);
  });
});
