create table public.usage_metrics (
  activity_type text not null,
  mode text not null,
  started_count bigint not null default 0,
  finished_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_metrics_pkey primary key (activity_type, mode),
  constraint usage_metrics_activity_type_check check (activity_type in ('games', 'puzzles', 'drills'))
);

create trigger set_usage_metrics_updated_at
before update on public.usage_metrics
for each row
execute function public.set_updated_at();

insert into public.usage_metrics (activity_type, mode)
values
  ('games', 'computer'),
  ('games', 'pass-n-play'),
  ('puzzles', 'standard'),
  ('drills', 'coordinates'),
  ('drills', 'moves')
on conflict (activity_type, mode) do nothing;

alter table public.usage_metrics enable row level security;

create or replace function public.increment_usage_metric(
  p_activity_type text,
  p_mode text,
  p_stage text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stage not in ('started', 'finished') then
    raise exception 'Invalid usage metric stage: %', p_stage
      using errcode = '22023';
  end if;

  update public.usage_metrics
  set
    started_count = started_count + case when p_stage = 'started' then 1 else 0 end,
    finished_count = finished_count + case when p_stage = 'finished' then 1 else 0 end,
    updated_at = now()
  where activity_type = p_activity_type
    and mode = p_mode;

  if not found then
    raise exception 'Invalid usage metric target: %/%', p_activity_type, p_mode
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.increment_usage_metric(text, text, text) from public;
grant execute on function public.increment_usage_metric(text, text, text) to anon;
grant execute on function public.increment_usage_metric(text, text, text) to authenticated;
