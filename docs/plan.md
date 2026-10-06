# KeywordFit 7일 실행 계획

설계 근거는 [design.md](./design.md). 매일 끝날 때 [ai-log.md](./ai-log.md)를 기록한다.

**커밋 규칙:** 함수 하나·파일 하나 단위. 형식 `[타입](스코프): 대상 — 변경 내용`.
아래 "커밋 단위"는 그날의 예상 커밋 목록이다 (그대로 지키는 게 아니라 쪼개는 기준).

**비용 규칙:** 전부 무료 플랜. 카드 등록이 필요한 서비스는 쓰지 않는다.

---

## D1 — 키 확보 + 실제 응답 확인 + 빈 페이지 배포

**목표:** 키 3종 확보, 공공데이터 2종 실제 응답 확인, 빈 페이지가 Vercel URL에서 열린다.

> 발급 절차: [api-keys.md](./api-keys.md) — 시작 전에 먼저 읽기

- [x] (가장 먼저) 공공데이터포털 회원가입 → 관세청 API 활용신청 (품목별 + 품목별 국가별 2종)
- [x] KOSIS 회원가입 → OpenAPI 활용신청 → 인증키
- [x] KOSIS 온라인쇼핑동향 표 확정: `DT_1KE10041`, `itmId=T20`, `objL1=ALL`, `objL2=00`
- [x] 공공데이터포털에서 "관세청_HS부호" + "HS부호 단위별 품목명" XLSX 다운로드 → `data/raw/`
- [x] Google AI Studio에서 Gemini 키 발급 (무료, 결제 설정 안 함)
- [ ] Supabase Free 프로젝트 생성 (Seoul) ✅, `api_cache` 테이블 ❌ (DB 비밀번호 인증 실패 — 2026-10-06)
- [x] Next.js 16.3.8(App Router, TS, Tailwind) 셋업, Vitest 설치, git init
- [x] `.gitignore`에 `.env*` + `!.env.example` → 첫 커밋 전 `git status`로 키 파일 없는지 확인
- [x] `.env.example`, `src/lib/env.ts`(zod) + 테스트 6개
- [x] **KOSIS·관세청·Gemini를 curl로 한 번씩 호출** → design.md §3 필드명·코드 확정
- [x] GitHub(oofy-sotry/keywordfit) → Vercel 연결, 환경변수 등록, 함수 리전 `icn1` → https://keywordfit-blue.vercel.app

**완료 기준:** Vercel URL에서 페이지 표시, curl로 세 API 모두 정상 응답, §3 확정.

커밋 단위 예:
- `chore(init): create-next-app — Next.js App Router + TS 프로젝트 생성`
- `chore(test): vitest — 테스트 러너 설정 추가`
- `chore(env): .env.example — 환경변수 키 목록 추가`
- `feat(env): env.ts — zod 환경변수 검증 추가`
- `feat(db): 0001_api_cache.sql — 캐시 테이블 마이그레이션 추가`
- `docs(design): design.md §3 — 실제 응답 기준 필드명 확정`

## D2 — 관세청 수입 데이터 (F3)

- [ ] `period.ts` 월 범위·1년 구간 분할 + 테스트 (**먼저**)
- [ ] `customs/parse.ts` XML 정규화 + 테스트 (1건/여러 건/0건/오류)
- [ ] `metrics.ts` `unitPrice`, `sumByMonth`, `topShares`, `yoy` + 테스트
- [ ] `lib/http.ts`, `lib/errors.ts` — 타임아웃·에러 코드 매핑
- [ ] `customs/trade.ts` — 2구간 호출·합치기
- [ ] `/api/analyze` — `imports` 섹션만 (hs 파라미터 직접 입력)
- [ ] `ImportChart`, `CountryShareTable`

**완료 기준:** HS코드 입력 → 월별 수입액·단가 차트와 수입국 표가 배포 URL에서 보인다.

커밋 단위 예:
- `feat(period): period.ts getMonthRange 함수 추가`
- `test(period): period.ts — 연말 경계 테스트 추가`
- `feat(customs): parse.ts parseTradeXml 함수 추가`
- `feat(metrics): metrics.ts calcUnitPrice 함수 추가`
- `feat(customs): trade.ts fetchImports 함수 추가`
- `feat(ui): ImportChart.tsx — 수입액·단가 차트 추가`

## D3 — KOSIS 시장 데이터 (F2) + Supabase 캐시

- [ ] `kosis/parse.ts` `parseStatValue`, 응답 정규화 + 테스트 (**먼저**)
- [ ] `kosis/categories.ts` — D1에 확정한 상품군 코드
- [ ] `kosis/onlineShopping.ts` — 최근 25개월
- [ ] `/api/analyze`에 `market` 섹션, `Promise.allSettled`로 병렬화
- [ ] `supabase.ts`, `cache.ts` `getOrFetch` — 캐시 실패 시 우회
- [ ] KOSIS·관세청 호출을 `getOrFetch`로 감싸기
- [ ] `MarketChart`, `SummaryCards`, 기준월·출처 표기

**완료 기준:** 같은 조건 두 번째 조회 시 `cached: true`. KOSIS 키를 일부러 틀려도 수입 섹션은 정상.

## D4 — HS코드 데이터 + 분류 (F1)

- [ ] `scripts/build-hs-codes.ts` — XLSX → `data/hs-codes.json`
- [ ] `hs/hsCodes.ts` `existsHsCode`, `searchHsByName` + 테스트
- [ ] `ai/client.ts`, `ai/prompt.ts`(`PROMPT_VERSION`)
- [ ] `ai/validate.ts` `validateClassification` + 테스트 (**먼저**)
- [ ] `ai/classify.ts`, `/api/classify` — AI 실패 시 품명 검색 대체
- [ ] `ProductForm`, `ClassificationPicker` → 선택하면 `/api/analyze` 호출

**완료 기준:** "무선 이어폰" 입력 → 상품군·HS 후보 표시 → 선택 → 시장·수입 화면까지 한 흐름.

## D5 — 진입 판단 지표 + AI 코멘트 (F4)

- [ ] `opportunity.ts` `classifyOpportunity` + 경계값 테스트 (**먼저**)
- [ ] `/api/analyze`에 `opportunity` 섹션, `OpportunityBadge`
- [ ] `ai/validate.ts` `validateInsight` + 테스트 (**먼저**)
- [ ] `ai/insight.ts`, `/api/insight` — 서버에서 데이터 재조회, 자리표시자 치환, 캐시, 일일 상한
- [ ] `InsightPanel` — 코멘트 + 근거 지표 칩
- [ ] 품목 5개로 결과 품질 확인 → 프롬프트 수정 내역 ai-log 기록

**완료 기준:** 코멘트 3~4개가 근거 지표와 함께 표시되고, AI가 지어낸 숫자는 걸러진다.

## D6 — 품질·테스트·사용자 검증

- [ ] 대표 품목 20개로 지표 분포 확인 → 임계값 조정 (근거 기록)
- [ ] fetch mock 테스트 (정상/키 오류/429/타임아웃)
- [ ] 엣지 케이스: 빈 입력, 특수문자, 수입 실적 없는 HS코드, 최근 달 미공표
- [ ] 모바일 폭 UI, `?q=&hs=` URL 동기화
- [ ] 지인 셀러 2~3명 테스트 → 피드백과 반영 여부 기록

**완료 기준:** `npm test` 통과, 셀러 피드백 최소 3건 기록.

## D7 — 포트폴리오 마감

- [ ] README: 문제 정의 / 데이터 소스 전환 경위(네이버 → 공공데이터) / 기능 / 아키텍처 / 내 역할 / 사용한 AI 도구(ai-log 요약) / 검증 방법 / 한계 / 배포 링크
- [ ] 시연 영상 (1~2분): 상품 입력 → 분류 선택 → 시장·수입 차트 → 진입 판단 → AI 코멘트 근거 확인
- [ ] 이력서·포트폴리오 링크 교체
- [ ] 저장소 전체 키 문자열 검색 (`git log -p | grep` 등)

---

## 일정 밀릴 때 자를 순서

1. 모바일 비중 표시 (선택)
2. 단가 YoY 보조 지표 → 단가 추이 차트만
3. AI 분류 → HS 품명 검색만 (AI는 코멘트에만)
4. fetch mock 테스트 → 순수 함수 테스트만

**자르지 않는 것:** parse 테스트, 지표 계산 테스트, AI 출력 검증, ai-log 기록.
