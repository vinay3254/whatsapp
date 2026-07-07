alter table messages
  add column media_url text,
  add column media_type text check (media_type in ('image', 'video')),
  add column media_size_bytes bigint;

alter table messages
  alter column text drop not null;
alter table messages
  add constraint messages_text_or_media_check
    check (text is not null or media_url is not null);

alter table profiles
  add column notifications_enabled boolean not null default true;

insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do nothing;

create policy "participants can upload message media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
  );

create policy "participants can read message media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
  );
