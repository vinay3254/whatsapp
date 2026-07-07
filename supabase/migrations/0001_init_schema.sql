create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  status_message text,
  read_receipts_enabled boolean not null default true,
  last_seen_visibility text not null default 'contacts'
    check (last_seen_visibility in ('everyone', 'contacts', 'nobody')),
  profile_photo_visibility text not null default 'everyone'
    check (profile_photo_visibility in ('everyone', 'contacts', 'nobody')),
  created_at timestamptz not null default now()
);

create table contacts (
  owner_id uuid not null references profiles (id) on delete cascade,
  contact_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references profiles (id) on delete cascade,
  callee_id uuid not null references profiles (id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing', 'missed')),
  created_at timestamptz not null default now()
);

create table updates_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  text text,
  image_url text,
  created_at timestamptz not null default now(),
  check (text is not null or image_url is not null)
);

create or replace function public.is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = conv_id and user_id = uid
  );
$$;

create or replace function public.is_contact(owner uuid, other uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from contacts where owner_id = owner and contact_id = other
  );
$$;

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table calls enable row level security;
alter table updates_posts enable row level security;

create policy "profiles are readable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "users can read their own contacts"
  on contacts for select to authenticated using (auth.uid() = owner_id);

create policy "users can add their own contacts"
  on contacts for insert to authenticated with check (auth.uid() = owner_id);

create policy "users can remove their own contacts"
  on contacts for delete to authenticated using (auth.uid() = owner_id);

create policy "participants can read their conversations"
  on conversations for select to authenticated
  using (is_conversation_participant(id, auth.uid()));

create policy "authenticated users can create conversations"
  on conversations for insert to authenticated with check (true);

create policy "participants can read participant rows"
  on conversation_participants for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));

create policy "users can add themselves or a contact as a participant"
  on conversation_participants for insert to authenticated
  with check (user_id = auth.uid() or is_contact(auth.uid(), user_id));

create policy "participants can read messages"
  on messages for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));

create policy "participants can send messages"
  on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id, auth.uid()));

create policy "participants can mark messages read"
  on messages for update to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()))
  with check (is_conversation_participant(conversation_id, auth.uid()));

create policy "users can read their own calls"
  on calls for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "users can log calls they place"
  on calls for insert to authenticated with check (auth.uid() = caller_id);

create policy "users can read own and contacts updates"
  on updates_posts for select to authenticated
  using (auth.uid() = user_id or is_contact(auth.uid(), user_id));

create policy "users can create their own updates"
  on updates_posts for insert to authenticated with check (auth.uid() = user_id);

create policy "users can delete their own updates"
  on updates_posts for delete to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table calls;
