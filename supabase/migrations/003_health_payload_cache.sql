-- the dashboard payload is assembled from the per-record tables in
-- 002_health_archive.sql (cycles/recoveries/sleeps/workouts/body) on
-- every request. supabase IS the source of truth — there is no
-- separate payload cache.
--
-- the only thing we cache here is the openrouter editorial copy,
-- because regenerating it is the only slow + costly part of the
-- assembly. we hash the summary inputs (recovery, strain, sleep,
-- recent recoveries) and skip the openrouter call when the hash
-- matches the last cached copy. synced_at is bumped on every cron
-- run so the dashboard can show how stale the data is.
--
-- rls is enabled with no anon policies — only service_role touches this.

-- earlier draft of this migration created health_payload_cache; drop
-- it if it was applied so this migration is idempotent across both
-- old and fresh databases.
drop table if exists health_payload_cache;

create table if not exists health_copy_cache (
  id           int primary key default 1,
  input_hash   text not null,
  copy         jsonb not null,
  synced_at    timestamptz not null default now(),
  constraint health_copy_cache_singleton check (id = 1)
);

alter table health_copy_cache enable row level security;
