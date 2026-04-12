alter table public.profiles
add column if not exists email text;

update public.profiles as profiles
set email = lower(users.email)
from auth.users as users
where users.id = profiles.id
  and users.email is not null
  and profiles.email is distinct from lower(users.email);

alter table public.profiles
alter column created_at type timestamp without time zone
using created_at at time zone 'America/New_York';

alter table public.profiles
alter column updated_at type timestamp without time zone
using updated_at at time zone 'America/New_York';

alter table public.profiles
alter column created_at set default (now() at time zone 'America/New_York');

alter table public.profiles
alter column updated_at set default (now() at time zone 'America/New_York');

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now() at time zone 'America/New_York';
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();
