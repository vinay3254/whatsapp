-- Move profile creation into a trigger on auth.users so signup is atomic:
-- if the profile insert fails (e.g. duplicate username), the whole
-- transaction rolls back, including the auth.users row itself. This
-- replaces the previous client-side two-step signup (auth.signUp, then a
-- separate insert into profiles), which could leave an orphaned,
-- permanently-broken auth.users row with no profile if the second step
-- failed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
