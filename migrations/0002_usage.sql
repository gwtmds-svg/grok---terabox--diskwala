-- Aggregate usage only. No accounts, no pasted links, no cookies.
create table if not exists usage_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  host text not null,
  outcome text not null,
  file_count integer not null default 0,
  elapsed_ms integer not null default 0,
  device text not null default 'desktop'
);

create index if not exists usage_events_created_idx on usage_events (created_at desc);
