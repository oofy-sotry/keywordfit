-- 외부 API 결과 캐시. 서버(secret 키)만 접근한다.
create table if not exists api_cache (
  cache_key   text primary key,          -- 예: 'customs:851830:202509-202608'
  source      text not null,             -- 'kosis' | 'customs' | 'ai-classify' | 'ai-insight'
  payload     jsonb not null,            -- 정규화된 결과 (원본 아님)
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists api_cache_source_created_idx on api_cache (source, created_at);

-- 정책 없음 = anon/publishable 키 접근 차단
alter table api_cache enable row level security;
