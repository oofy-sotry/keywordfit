# KeywordFit

@AGENTS.md

셀러용 품목·시장 분석 웹서비스 (공공데이터 기반). 상품 → 상품군·HS코드 분류 → 온라인 시장 추이(KOSIS) + 수입 동향·단가·수입국(관세청) + 진입 판단 지표 + AI 코멘트.
설계: `docs/design.md` / 일정: `docs/plan.md` / 키 발급: `docs/api-keys.md` / 작업 기록: `docs/ai-log.md`

## 스택

Next.js App Router + TypeScript, Route Handlers(Node.js), Tailwind, Recharts, zod, fast-xml-parser, Supabase(캐시), `@google/genai`(Gemini 무료 티어), Vitest, Vercel — **전부 무료 플랜만 사용. 카드 등록이 필요한 서비스 금지.**

## 명령어

- `npm run dev` — 로컬 서버
- `npm test` — Vitest
- `npm run lint` / `npx tsc --noEmit`

## 규칙

- **API 키는 서버 코드에서만.** `NEXT_PUBLIC_` 접두사 금지. 환경변수는 `src/lib/env.ts`를 통해서만 읽는다.
- `.env.local`은 절대 커밋하지 않는다. 새 환경변수를 추가하면 `.env.example`과 `design.md` §9도 갱신.
- 외부 API 호출은 `src/lib/kosis/*`, `src/lib/customs/*`, `src/lib/ai/*`에만 둔다. Route Handler는 조립만 한다. Gemini SDK 호출은 `ai/client.ts` 한 곳.
- 외부 API 결과는 `supabase.ts`의 `getOrFetch`(로직은 `cache.ts` `createCache`)를 거친다. 캐시 실패가 요청 실패가 되면 안 된다.
- 커밋 전 `git diff --cached --stat`으로 스테이징 범위를 확인한다 (`git mv` 등으로 미리 스테이징된 변경이 다른 커밋에 섞이지 않게).
- 계산·변환 로직은 순수 함수로 분리하고 테스트를 먼저 쓴다 (응답 파싱, 기간 계산, YoY·단가·점유율, 진입 판단, AI 출력 검증).
- KOSIS·공공데이터포털은 **오류도 HTTP 200으로 온다** → 본문(`err`, `resultCode`)을 반드시 검사.
- KOSIS `DT`는 문자열 → `parseStatValue`로만 변환. 관세청 XML은 결과 1건이면 객체 → 항상 배열로 정규화.
- 공공데이터포털 `serviceKey`는 Decoding 키를 `URLSearchParams`로 한 번만 인코딩.
- 모든 지표는 월 단위·공표 지연이 있다 → 화면에 **기준월과 출처**를 항상 표기.
- AI 응답을 그대로 화면에 쓰지 않는다. HS코드·상품군은 `validateClassification`으로 코드표 검증, 코멘트는 `validateInsight`로 자리표시자 밖 숫자를 거르고 수치는 우리 데이터로 채운다.
- 프롬프트를 바꾸면 `PROMPT_VERSION`을 올린다 (캐시 키에 포함됨).
- 막힌 부분·예상과 다른 동작·해결 방법은 `docs/local/troubleshooting.md`에 바로 기록한다 (git 제외 폴더).

## 커밋

함수 하나·파일 하나 단위로 작게. 형식: `[타입](스코프): 대상 — 변경 내용`
예) `feat(customs): parse.ts parseTradeXml 함수 추가`
