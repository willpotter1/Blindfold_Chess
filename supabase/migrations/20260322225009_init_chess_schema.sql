create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_lowercase_check check (username = lower(username)),
  constraint profiles_username_format_check check (username ~ '^[a-z0-9_]{3,20}$')
);

create unique index profiles_username_key on public.profiles (username);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.games (
  id uuid primary key default gen_random_uuid(),
  legacy_firebase_doc_id text,
  user_id uuid references public.profiles (id) on delete cascade,
  pgn text not null,
  mode text not null,
  player_color text,
  engine_elo integer,
  reveal_every integer not null,
  allow_cheats boolean not null,
  hide_move_history boolean not null,
  created_at timestamptz not null default now(),
  constraint games_legacy_firebase_doc_id_key unique (legacy_firebase_doc_id),
  constraint games_mode_check check (mode in ('computer', 'pass-n-play')),
  constraint games_player_color_check check (player_color is null or player_color in ('white', 'black')),
  constraint games_reveal_every_check check (reveal_every >= 0),
  constraint games_engine_elo_check check (engine_elo is null or engine_elo between 1300 and 2800),
  constraint games_mode_shape_check check (
    (mode = 'computer' and player_color is not null and engine_elo is not null)
    or
    (mode = 'pass-n-play' and player_color is null and engine_elo is null)
  )
);

create index games_user_id_created_at_idx on public.games (user_id, created_at desc);

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.games to authenticated;

alter table public.profiles enable row level security;
alter table public.games enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "games_select_own"
on public.games
for select
to authenticated
using (user_id = auth.uid());

create policy "games_insert_own"
on public.games
for insert
to authenticated
with check (user_id = auth.uid());
