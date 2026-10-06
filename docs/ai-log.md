# AI 작업 기록

매일 두 가지를 기록한다. 포트폴리오 "사용한 AI 도구" 항목의 근거.

- **맡긴 것:** Claude Code에게 시킨 작업 (프롬프트 요지)
- **검증·수정한 것:** 내가 직접 확인한 방법, 틀렸던 부분과 고친 내용

막힌 부분의 상세 기록은 로컬 전용 `docs/local/troubleshooting.md`(git 제외)에 따로 둔다.

---

## D0~D1 (2026-10-05 ~ 2026-10-06)

### 요약

- 네이버 API 기반 "키워드 분석"으로 설계했으나, 키 발급 단계에서 데이터 소스가 막혀 **공공데이터(KOSIS + 관세청) 기반 "품목·시장 분석"으로 피벗**.
- AI는 Claude API(유료) → **Gemini 무료 티어**로 교체. 전체 스택 무료·카드 등록 없음.
- 키 4종 발급·실호출 검증, Next.js 16 셋업, 환경변수 검증(테스트 우선), GitHub 저장소·Vercel 배포까지 완료.
- 배포: https://keywordfit-blue.vercel.app / 저장소: https://github.com/oofy-sotry/keywordfit

### Claude Code에게 맡긴 것

- 설계 문서(design.md), 7일 계획(plan.md), 키 발급 가이드(api-keys.md) 작성
- 네이버 검색광고 API의 개인 가입 가능 여부 웹 조사 → 자료가 엇갈려 결론 못 냄
- 유료 항목을 무료로 대체할 방법 조사 → Gemini 무료 티어 선정, GitHub Models는 2026-07-30 종료 확인
- 네이버 개발자센터 공지(쇼핑 검색 API 종료, 데이터랩 NAVER API HUB 이관) 영향 분석 → 대안 비교
- "네이버가 아니라 데이터 사용이 중요" → 무료 공공데이터 조사, 서비스 구조 재설계 및 문서 전면 재작성
- 발급받은 키로 KOSIS·관세청·Gemini·Supabase 실제 호출 → 응답 구조를 설계서 §3에 반영
- HS부호 파일 2종 구조 분석 → 10자리 품명 "기타" 문제 발견, 단위별 품목명 파일로 보강 결정
- Next.js 셋업, Vitest, `.env.example`, `env.ts`(zod) + 테스트, 마이그레이션 SQL, `vercel.json`
- 최소 단위 커밋 9개, GitHub public 저장소 생성·푸시, Vercel 연결·환경변수 등록·배포

### 직접 검증하고 고친 것

- **네이버 개발자센터 로그인 후 공지를 직접 확인**해 쇼핑 API 종료 사실을 발견 → AI 조사만으로는 몰랐던 정보. 이 공지로 피벗 결정
- 키 발급은 직접 진행하면서 AI 안내와 다른 화면을 피드백
  - KOSIS 메뉴명이 실제와 달랐음 (실제: 활용신청 / 개발 가이드 → 통계자료 → URL 생성 탭) → 문서 수정
  - KOSIS 통계표 ID를 AI가 `DT_1KE10051`로 잘못 적어 둠 → 실제 검색 결과 `DT_1KE10041`로 정정
  - KOSIS URL 생성 시 분류 순서(분류1=상품군, 분류2=취급상품범위)가 안내와 반대 → 코드에서 `objL1=ALL&objL2=00`으로 확정
- 실제 API 호출로 확인한 설계 수정 사항
  - 관세청: 조회 기간 최대 1년, 첫 행은 "총계", 없는 HS코드는 오류 없이 빈 결과 → AI가 낸 HS코드 검증 필요성 확인
  - Gemini: `gemini-2.5-flash`가 신규 사용자 404 → `gemini-flash-latest`로 변경, 무료 티어 503 대비 대체 모델 추가
  - Supabase: publishable 키로는 서버 캐시 불가 → secret 키로 교체
- 셋업 오류: Vitest 5와 템플릿 `@types/node` 20 충돌 → 실제 런타임(Node 24)에 맞춰 올림 (`--force` 사용 안 함)
- 커밋 전 `git status`와 `git log -p` 검색으로 키 문자열이 저장소에 없는지 확인

### 메모 / 다음 할 일

- [ ] Supabase `api_cache` 테이블 생성 (DB 비밀번호 인증 실패 — 현재 비밀번호 확인 필요)
- [ ] D2: 관세청 수입 데이터 (`period.ts` → `customs/parse.ts` → `metrics.ts` → `trade.ts` → `/api/analyze` imports 섹션)
- 결정: 프로젝트 이름은 일단 KeywordFit 유지 (서비스 성격이 바뀌어 변경 검토 중)
