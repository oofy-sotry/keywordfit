# 키 발급 · 데이터 신청 가이드 (D1)

조사일: 2026-10-06. 공식 사이트 화면을 직접 보지 못해 2차 자료 기준. **실제 화면과 다른 점은 이 문서에 바로 고쳐 둘 것.**

모두 **무료 · 카드 등록 없음 · 사업자번호 없음**.

## 진행 순서

| 순서 | 할 일 | 소요 | 이유 |
|---|---|---|---|
| 1 | 공공데이터포털 가입 + 관세청 API 활용신청 | 10분 | 키 활성화까지 1~2시간 걸릴 수 있어 가장 먼저 |
| 2 | 공공데이터포털에서 HS부호 파일 다운로드 | 3분 | 1번과 같은 사이트 |
| 3 | KOSIS 가입 + 인증키 + 통계표 URL 생성 | 15분 | |
| 4 | Google AI Studio에서 Gemini 키 | 3분 | |
| 5 | Supabase 프로젝트 생성 | 5분 | D3에 필요, 미뤄도 됨 |

받은 키는 `~/Desktop/KeywordFit/.env.local`의 `=` 뒤에 **따옴표·공백 없이** 붙여넣는다. 키 값은 채팅에 보내지 않는다.

---

## 1. 공공데이터포털 — 관세청 수출입실적 API

| 항목 | 내용 |
|------|------|
| 자격 | 개인 회원 가능 (네이버·카카오 간편가입 가능) |
| 심의 | 개발계정 **자동승인** |
| 한도 | 개발계정 일 10,000회 |
| 받는 키 | 일반 인증키 (Encoding / Decoding 두 형태로 표시됨 — **Decoding 사용**) |

**방법**
1. **https://www.data.go.kr** 접속 → 오른쪽 위 **회원가입** → 개인회원(또는 간편가입) → 로그인
2. 상단 검색창에 **`관세청_품목별 국가별 수출입실적`** 검색
3. 결과에서 **오픈API** 탭의 **"관세청_품목별 국가별 수출입실적(GW)"** 클릭 (URL에 `15100475`)
4. 오른쪽 **활용신청** 버튼 클릭
5. 신청서 작성
   - 활용목적: **웹 사이트 개발** (또는 "참고자료" — 아무거나 무방)
   - 상세 설명: `셀러용 품목 시장 분석 포트폴리오 웹서비스 개발`
   - 상세기능: 보이는 항목 **전부 체크**
   - 라이선스 표시 동의 체크 → **활용신청**
6. (권장) 같은 방법으로 **"관세청_품목별 수출입실적(GW)"**(URL에 `15101609`)도 활용신청 — 국가 합계 확인용 예비
7. **마이페이지 → 데이터활용 → Open API → 활용신청 현황** → 신청한 API 클릭 → **개발계정 상세보기**
8. **일반 인증키 (Decoding)** 값을 `DATA_GO_KR_SERVICE_KEY=`에 붙여넣기
   - Encoding 키가 아니라 **Decoding** 키. 인증키는 계정당 하나라 두 API에 공통.

**주의**
- 신청 직후 호출하면 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`가 날 수 있음 → **1~2시간 뒤 정상**. 실패해도 키를 재발급하지 말 것.

## 2. 공공데이터포털 — 관세청 HS부호 파일

1. data.go.kr 검색창에 **`관세청_HS부호`** 검색
2. **파일데이터** 탭에서 **"관세청_HS부호_20260101"** 클릭 (URL에 `15049722`)
3. **다운로드** 클릭 (XLSX, 로그인 상태면 바로 받아짐)
4. 받은 파일을 **`~/Desktop/KeywordFit/data/raw/`** 폴더에 저장 (폴더 없으면 만들기)

## 3. 통계청 KOSIS — 온라인쇼핑동향

| 항목 | 내용 |
|------|------|
| 자격 | KOSIS 일반 회원 |
| 심의 | **자동승인**, 즉시 사용 |
| 받는 키 | 인증키 1개 (모든 통계에 공통) |

(2026-10-06 실제 진행 기준으로 수정)

**3-1. 가입 + 인증키**
1. **https://kosis.kr/openapi** 접속 → **회원가입** → 로그인
2. 상단 메뉴 **활용신청** (메뉴: 소개 및 이용방법 / 활용신청 / 개발 가이드 / 커뮤니티 / 이용현황) → 서비스명·목적 입력 → 신청
3. 활용신청 화면에 표시되는 **사용자 인증키** 복사 → `KOSIS_API_KEY=`

**3-2. 통계표 URL 생성 (참고용 — 코드는 이미 확정됨)**
1. **개발 가이드 → 통계자료** → 화면 안 **"URL 생성"** 탭 ("자료등록" 탭 아님)
2. 통계표 검색 **`온라인쇼핑몰 취급상품범위별/상품군별거래액`** → **국가데이터처(101) `DT_1KE10041`** 선택
3. 이 표는 **분류1 = 상품군, 분류2 = 취급상품범위** → 분류1 전체, 분류2는 "계"(`00`)
4. 확정된 호출: `itmId=T20&objL1=ALL&objL2=00&prdSe=M&newEstPrdCnt=25&format=json&jsonVD=Y&orgId=101&tblId=DT_1KE10041`

## 4. Gemini API — Google AI Studio (무료 티어)

| 항목 | 내용 |
|------|------|
| 자격 | Google 계정 |
| 비용 | **무료.** 카드 등록 불필요, 결제 설정을 안 하면 과금 없음 |
| 무료 한도 | Flash 계열 약 10 RPM / 1,500 RPD (발급 후 AI Studio에서 확인해 여기 고칠 것) |
| 주의 | 무료 티어 입력은 Google 제품 개선에 쓰일 수 있음 → 개인정보는 보내지 않음 |

1. **https://aistudio.google.com** → Google 로그인 → 약관 동의
2. 왼쪽 **Get API key** → **Create API key**
3. 키를 `GEMINI_API_KEY=`에 붙여넣기
4. **Billing(결제) 설정은 하지 않는다**

## 5. Supabase — 캐시 DB (Free, D3에 필요)

1. **https://supabase.com** → GitHub 계정으로 가입 → **New project**
2. 이름 `keywordfit`, 리전 **Northeast Asia (Seoul)**, DB 비밀번호는 따로 메모
3. **Project Settings → API**
   - Project URL → `SUPABASE_URL=`
   - **service_role** 키 (anon 아님) → `SUPABASE_SERVICE_ROLE_KEY=`
4. Free 플랜은 7일 비활성 시 자동 일시정지 → 시연 전 대시보드에서 재개 확인

---

## 검토했지만 제외한 소스

| 소스 | 제외 이유 |
|------|----------|
| 네이버 쇼핑 검색 API | 2026-07-31 대체 없이 종료 |
| 네이버 데이터랩(검색어트렌드) | 개발자센터 신규 신청 차단, NAVER API HUB는 NCP 가입 시 카드 등록 필수 |
| 네이버 검색광고 API | 개인(사업자번호 없음) 가입 가능 여부 불확실 |
| Google Trends 공식 API | 신청제 알파, 사실상 발급 불가 |
| GitHub Models (GPT 무료) | 2026-07-30 완전 종료 |
| Claude API | 유료 크레딧 필요 |
| Groq 무료 티어 | 사용 가능 — Gemini가 막힐 때 대체 수단으로 보류 |

## 출처

- [KOSIS 공유서비스 (OpenAPI)](https://kosis.kr/openapi/?sso=ok)
- [KOSIS Open API 가입·키 발급 가이드](https://skills.itda.work/credentials/kosis/)
- [PublicDataReader — KOSIS 파라미터 문서](https://github.com/WooilJeong/PublicDataReader/blob/main/assets/docs/kosis/Kosis.md)
- [관세청_품목별 국가별 수출입실적(GW)](https://www.data.go.kr/data/15100475/openapi.do)
- [관세청_품목별 수출입실적(GW)](https://www.data.go.kr/data/15101609/openapi.do)
- [관세청_HS부호 (파일데이터)](https://www.data.go.kr/data/15049722/fileData.do)
- [NAVER API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)
- [네이버 API HUB 이관 정리 (Keyword Cockpit)](https://keywordcockpit.com/naver-api-hub-migration/)
- [GitHub Models is now retired](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)
- [Gemini API Free Tier 2026 (pecollective)](https://pecollective.com/tools/gemini-free-tier-guide/)
- [Groq Free Tier Limits 2026 (TokenMix)](https://tokenmix.ai/blog/groq-free-tier-limits-2026)
- [Google Trends still has no API in 2026](https://dev.to/radevicb/google-trends-still-has-no-api-in-2026-heres-what-i-use-instead-1840)
