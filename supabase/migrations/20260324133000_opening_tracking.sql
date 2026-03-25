alter table public.usage_metrics
  drop constraint if exists usage_metrics_activity_type_check;

alter table public.usage_metrics
  add constraint usage_metrics_activity_type_check
  check (activity_type in ('games', 'puzzles', 'drills', 'openings'));

insert into public.usage_metrics (activity_type, mode)
values ('openings', 'trainer')
on conflict (activity_type, mode) do nothing;

create table public.opening_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  opening_line_id text not null,
  opening_eco text not null,
  opening_name text not null,
  opening_family text not null,
  opening_pgn text not null,
  opening_uci text not null,
  player_color text not null,
  depth_player_moves integer not null,
  reveal_every integer not null,
  allow_cheats boolean not null,
  hide_move_history boolean not null,
  selected_family_names text[] not null,
  selected_line_ids text[] not null,
  played_uci_moves text[] not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  constraint opening_rounds_player_color_check check (player_color in ('white', 'black')),
  constraint opening_rounds_depth_player_moves_check check (depth_player_moves >= 1),
  constraint opening_rounds_reveal_every_check check (reveal_every >= 0),
  constraint opening_rounds_played_uci_moves_cardinality_check check (cardinality(played_uci_moves) >= 1),
  constraint opening_rounds_completed_after_started_check check (completed_at >= started_at)
);

create index opening_rounds_user_id_completed_at_idx
on public.opening_rounds (user_id, completed_at desc);

create index opening_rounds_user_id_line_id_idx
on public.opening_rounds (user_id, opening_line_id);

create table public.opening_play_stats (
  opening_line_id text primary key,
  opening_eco text not null,
  opening_name text not null,
  opening_family text not null,
  play_count bigint not null default 0,
  unique_user_count bigint not null default 0,
  last_played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_play_stats_play_count_check check (play_count >= 0),
  constraint opening_play_stats_unique_user_count_check check (unique_user_count >= 0)
);

create index opening_play_stats_play_count_idx
on public.opening_play_stats (play_count desc);

create trigger set_opening_play_stats_updated_at
before update on public.opening_play_stats
for each row
execute function public.set_updated_at();

create or replace function public.record_opening_play_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  had_prior_play boolean;
  unique_user_increment bigint;
begin
  select exists(
    select 1
    from public.opening_rounds opening_round
    where opening_round.user_id = new.user_id
      and opening_round.opening_line_id = new.opening_line_id
      and opening_round.id <> new.id
  )
  into had_prior_play;

  unique_user_increment := case when had_prior_play then 0 else 1 end;

  insert into public.opening_play_stats (
    opening_line_id,
    opening_eco,
    opening_name,
    opening_family,
    play_count,
    unique_user_count,
    last_played_at
  )
  values (
    new.opening_line_id,
    new.opening_eco,
    new.opening_name,
    new.opening_family,
    1,
    unique_user_increment,
    new.completed_at
  )
  on conflict (opening_line_id) do update
  set
    opening_eco = excluded.opening_eco,
    opening_name = excluded.opening_name,
    opening_family = excluded.opening_family,
    play_count = public.opening_play_stats.play_count + 1,
    unique_user_count = public.opening_play_stats.unique_user_count + unique_user_increment,
    last_played_at = greatest(public.opening_play_stats.last_played_at, excluded.last_played_at),
    updated_at = now();

  return new;
end;
$$;

create trigger record_opening_play_stats_after_insert
after insert on public.opening_rounds
for each row
execute function public.record_opening_play_stats();

grant select, insert on public.opening_rounds to authenticated;
grant select on public.opening_play_stats to anon, authenticated;

alter table public.opening_rounds enable row level security;
alter table public.opening_play_stats enable row level security;

create policy "opening_rounds_select_own"
on public.opening_rounds
for select
to authenticated
using (user_id = auth.uid());

create policy "opening_rounds_insert_own"
on public.opening_rounds
for insert
to authenticated
with check (user_id = auth.uid());

create policy "opening_play_stats_select_public_anon"
on public.opening_play_stats
for select
to anon
using (true);

create policy "opening_play_stats_select_public_authenticated"
on public.opening_play_stats
for select
to authenticated
using (true);
