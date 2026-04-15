alter table public.profiles
add column if not exists email text;

alter table public.profiles
alter column email drop not null;

update public.profiles
set email = null
where email is not null;
