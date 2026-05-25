-- biomarker archive: lab results from function health pdfs, whoop advanced
-- labs pdfs, and nucleus genomics json. all data is private; rls is enabled
-- with no anon policies so only the service_role key (server-side only) can
-- read or write.
--
-- design:
--   biomarker_uploads — one row per uploaded file (audit trail + parse status)
--   biomarker_results — one row per lab measurement (canonical_name keyed for
--                       trend lookup, raw value/unit + reference range stored
--                       per-row because ranges vary by provider/draw)
--   biomarker_variants — one row per genomic variant (nucleus only)
--
-- idempotency: re-uploading the same pdf is safe — biomarker_results has a
-- unique constraint on (source, canonical_name, measured_at) so a second
-- upload upserts existing rows rather than duplicating.

create table if not exists biomarker_uploads (
  id            uuid primary key default gen_random_uuid(),
  source        text not null check (source in ('function_health', 'whoop_labs', 'nucleus')),
  filename      text not null,
  r2_key        text,
  uploaded_at   timestamptz not null default now(),
  status        text not null default 'parsing' check (status in ('parsing', 'parsed', 'failed')),
  parsed_count  int not null default 0,
  error         text
);
create index if not exists biomarker_uploads_uploaded_at_idx
  on biomarker_uploads (uploaded_at desc);

create table if not exists biomarker_results (
  id             uuid primary key default gen_random_uuid(),
  source         text not null check (source in ('function_health', 'whoop_labs', 'nucleus')),
  upload_id      uuid references biomarker_uploads(id) on delete set null,
  canonical_name text not null,
  raw_name       text not null,
  category       text,
  value          double precision,
  value_text     text,
  unit           text,
  ref_low        double precision,
  ref_high       double precision,
  ref_text       text,
  measured_at    timestamptz not null,
  raw_extracted  jsonb,
  created_at     timestamptz not null default now(),
  unique (source, canonical_name, measured_at)
);
create index if not exists biomarker_results_canonical_idx
  on biomarker_results (canonical_name, measured_at desc);
create index if not exists biomarker_results_measured_at_idx
  on biomarker_results (measured_at desc);
create index if not exists biomarker_results_category_idx
  on biomarker_results (category);

create table if not exists biomarker_variants (
  id            uuid primary key default gen_random_uuid(),
  upload_id     uuid references biomarker_uploads(id) on delete set null,
  gene          text,
  rsid          text,
  genotype      text,
  zygosity      text,
  significance  text,
  category      text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  unique (rsid, genotype)
);
create index if not exists biomarker_variants_gene_idx on biomarker_variants (gene);
create index if not exists biomarker_variants_category_idx on biomarker_variants (category);

alter table biomarker_uploads  enable row level security;
alter table biomarker_results  enable row level security;
alter table biomarker_variants enable row level security;
