-- single-row table holding the current whoop refresh token.
-- whoop rotates refresh tokens on every exchange, so we must persist the
-- new value after each call. only server-side code (service_role) touches
-- this — there is no anon policy, so the public anon key cannot read it.

create table if not exists whoop_tokens (
  id text primary key default 'current',
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table whoop_tokens enable row level security;

-- seed a single row so upserts have something to target.
insert into whoop_tokens (id, refresh_token)
values ('current', '')
on conflict (id) do nothing;
