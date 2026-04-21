-- long-term archive for health data, device-agnostic.
-- every record is keyed by (source, external_id) so upserts are idempotent
-- and future devices (oura, garmin, apple health) slot in by adding rows
-- with a different `source` value.
--
-- rls is enabled with no anon policies — only the service_role key
-- (server-side only) can read or write these tables.

create table if not exists health_sources (
  id   text primary key,
  name text not null
);

insert into health_sources (id, name) values ('whoop', 'WHOOP')
  on conflict (id) do nothing;

create table if not exists health_cycles (
  source      text        not null references health_sources(id),
  external_id text        not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  score       jsonb,
  raw         jsonb       not null,
  fetched_at  timestamptz not null default now(),
  primary key (source, external_id)
);
create index if not exists health_cycles_start_at_idx
  on health_cycles (source, start_at desc);

create table if not exists health_recoveries (
  source      text        not null references health_sources(id),
  external_id text        not null,
  score       jsonb,
  raw         jsonb       not null,
  fetched_at  timestamptz not null default now(),
  primary key (source, external_id)
);

create table if not exists health_sleeps (
  source      text        not null references health_sources(id),
  external_id text        not null,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  nap         boolean     default false,
  score       jsonb,
  raw         jsonb       not null,
  fetched_at  timestamptz not null default now(),
  primary key (source, external_id)
);
create index if not exists health_sleeps_start_at_idx
  on health_sleeps (source, start_at desc);

create table if not exists health_workouts (
  source      text        not null references health_sources(id),
  external_id text        not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  sport_name  text,
  score       jsonb,
  raw         jsonb       not null,
  fetched_at  timestamptz not null default now(),
  primary key (source, external_id)
);
create index if not exists health_workouts_start_at_idx
  on health_workouts (source, start_at desc);

alter table health_sources    enable row level security;
alter table health_cycles     enable row level security;
alter table health_recoveries enable row level security;
alter table health_sleeps     enable row level security;
alter table health_workouts   enable row level security;
