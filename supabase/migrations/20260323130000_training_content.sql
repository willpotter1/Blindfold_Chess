create table public.puzzles (
  id text primary key,
  fen text not null,
  moves text[] not null,
  rating integer not null,
  themes text[] not null,
  game_url text,
  constraint puzzles_moves_cardinality_check check (
    cardinality(moves) >= 2
    and mod(cardinality(moves), 2) = 0
  ),
  constraint puzzles_themes_cardinality_check check (cardinality(themes) >= 1),
  constraint puzzles_rating_check check (rating >= 0)
);

create index puzzles_rating_idx on public.puzzles (rating);
create index puzzles_themes_gin_idx on public.puzzles using gin (themes);

create table public.drill_move_positions (
  id text primary key,
  fen text not null,
  san text not null,
  from_square text not null,
  to_square text not null,
  turn_color text not null,
  constraint drill_move_positions_from_square_check check (from_square ~ '^[a-h][1-8]$'),
  constraint drill_move_positions_to_square_check check (to_square ~ '^[a-h][1-8]$'),
  constraint drill_move_positions_turn_color_check check (turn_color in ('white', 'black'))
);

create index drill_move_positions_turn_color_idx
on public.drill_move_positions (turn_color);

grant select on public.puzzles to anon, authenticated;
grant select on public.drill_move_positions to anon, authenticated;

alter table public.puzzles enable row level security;
alter table public.drill_move_positions enable row level security;

create policy "puzzles_select_public_anon"
on public.puzzles
for select
to anon
using (true);

create policy "puzzles_select_public_authenticated"
on public.puzzles
for select
to authenticated
using (true);

create policy "drill_move_positions_select_public_anon"
on public.drill_move_positions
for select
to anon
using (true);

create policy "drill_move_positions_select_public_authenticated"
on public.drill_move_positions
for select
to authenticated
using (true);

create or replace function public.get_puzzle_batch(
  min_rating integer,
  max_rating integer,
  selected_themes text[],
  exclude_ids text[] default array[]::text[],
  batch_size integer default 24
)
returns setof public.puzzles
language sql
as $$
  select p.*
  from public.puzzles p
  where p.rating between min_rating and max_rating
    and cardinality(coalesce(selected_themes, array[]::text[])) > 0
    and p.themes && selected_themes
    and not (p.id = any(coalesce(exclude_ids, array[]::text[])))
  order by random()
  limit greatest(coalesce(batch_size, 24), 0)
$$;

grant execute on function public.get_puzzle_batch(integer, integer, text[], text[], integer)
to anon, authenticated;
