drop policy if exists "games_insert_own" on public.games;

drop index if exists public.profiles_legacy_firebase_uid_key;

alter table public.games
  drop constraint if exists games_guest_shape_check;

alter table public.games
  drop constraint if exists games_legacy_firebase_doc_id_key;

alter table public.profiles
  drop column if exists legacy_firebase_uid;

delete from public.games
where user_id is null;

alter table public.games
  drop column if exists legacy_firebase_doc_id,
  drop column if exists is_guest;

alter table public.games
  alter column user_id set not null;

create policy "games_insert_own"
on public.games
for insert
to authenticated
with check (user_id = auth.uid());
