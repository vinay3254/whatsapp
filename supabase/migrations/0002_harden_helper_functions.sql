create or replace function public.is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = uid
      and uid = auth.uid()
  );
$$;

create or replace function public.is_contact(owner uuid, other uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from contacts
    where owner_id = owner
      and contact_id = other
      and owner = auth.uid()
  );
$$;
