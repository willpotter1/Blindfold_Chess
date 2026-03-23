create table public.puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  puzzle_id text not null,
  puzzle_rating integer not null,
  puzzle_themes text[] not null,
  result text not null,
  player_move_count integer not null,
  wrong_move_count integer not null,
  min_rating integer not null,
  max_rating integer not null,
  reveal_every integer not null,
  allow_cheats boolean not null,
  hide_move_history boolean not null,
  selected_themes text[] not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  constraint puzzle_attempts_result_check check (result in ('solved', 'failed')),
  constraint puzzle_attempts_player_move_count_check check (player_move_count >= 1),
  constraint puzzle_attempts_wrong_move_count_check check (wrong_move_count >= 0),
  constraint puzzle_attempts_rating_range_check check (min_rating <= max_rating),
  constraint puzzle_attempts_reveal_every_check check (reveal_every >= 0),
  constraint puzzle_attempts_completed_after_started_check check (completed_at >= started_at)
);

create index puzzle_attempts_user_id_completed_at_idx
on public.puzzle_attempts (user_id, completed_at desc);

create index puzzle_attempts_user_id_result_idx
on public.puzzle_attempts (user_id, result);

create table public.drill_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  perspective text not null,
  show_coordinates boolean not null,
  round_length_seconds integer not null,
  moves_piece_display text,
  correct_count integer not null,
  wrong_count integer not null,
  total_attempts integer not null,
  score integer not null,
  accuracy double precision not null,
  completed_at timestamptz not null default now(),
  constraint drill_rounds_mode_check check (mode in ('coordinates', 'moves')),
  constraint drill_rounds_perspective_check check (perspective in ('white', 'black')),
  constraint drill_rounds_round_length_seconds_check check (round_length_seconds in (30, 60, 120)),
  constraint drill_rounds_moves_piece_display_check check (
    (mode = 'coordinates' and moves_piece_display is null)
    or
    (mode = 'moves' and moves_piece_display in ('board', 'panel'))
  ),
  constraint drill_rounds_correct_count_check check (correct_count >= 0),
  constraint drill_rounds_wrong_count_check check (wrong_count >= 0),
  constraint drill_rounds_total_attempts_check check (total_attempts = correct_count + wrong_count),
  constraint drill_rounds_score_check check (score = correct_count),
  constraint drill_rounds_accuracy_check check (accuracy >= 0 and accuracy <= 1)
);

create index drill_rounds_user_id_completed_at_idx
on public.drill_rounds (user_id, completed_at desc);

create index drill_rounds_user_id_mode_idx
on public.drill_rounds (user_id, mode);

grant select, insert on public.puzzle_attempts to authenticated;
grant select, insert on public.drill_rounds to authenticated;

alter table public.puzzle_attempts enable row level security;
alter table public.drill_rounds enable row level security;

create policy "puzzle_attempts_select_own"
on public.puzzle_attempts
for select
to authenticated
using (user_id = auth.uid());

create policy "puzzle_attempts_insert_own"
on public.puzzle_attempts
for insert
to authenticated
with check (user_id = auth.uid());

create policy "drill_rounds_select_own"
on public.drill_rounds
for select
to authenticated
using (user_id = auth.uid());

create policy "drill_rounds_insert_own"
on public.drill_rounds
for insert
to authenticated
with check (user_id = auth.uid());
