-- single-row cache for the precomputed dashboard payload.
-- the cron writes here after fetching live data from whoop/withings and
-- generating editorial copy. /api/health reads only from this row, so the
-- request path never touches whoop/withings/openrouter.
--
-- rls is enabled with no anon policies — only service_role touches this.

create table if not exists health_payload_cache (
  id           int primary key default 1,
  payload      jsonb not null,
  generated_at timestamptz not null default now(),
  constraint health_payload_cache_singleton check (id = 1)
);

alter table health_payload_cache enable row level security;
