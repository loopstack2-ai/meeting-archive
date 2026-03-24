-- ─────────────────────────────────────────────────────────────────────────────
-- Meeting Archive — Supabase schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ── meetings ──────────────────────────────────────────────────────────────────
create table public.meetings (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  title             text not null default 'Untitled Meeting',
  location          text,
  created_at        timestamptz default now() not null,
  duration_seconds  integer,
  file_size_bytes   bigint,
  status            text not null default 'processing'
                    check (status in ('recording', 'processing', 'completed', 'error')),
  storage_path      text
);

alter table public.meetings enable row level security;

create policy "Users can manage own meetings"
  on public.meetings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── transcripts ───────────────────────────────────────────────────────────────
create table public.transcripts (
  id            uuid primary key default uuid_generate_v4(),
  meeting_id    uuid references public.meetings(id) on delete cascade not null,
  speaker_label text not null,
  text          text not null,
  start_time    numeric not null,  -- seconds from start
  end_time      numeric not null,
  is_key_quote  boolean default false
);

alter table public.transcripts enable row level security;

create policy "Users can manage own transcripts"
  on public.transcripts
  for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id
        and m.user_id = auth.uid()
    )
  );

-- ── speakers ──────────────────────────────────────────────────────────────────
create table public.speakers (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid references public.meetings(id) on delete cascade not null,
  label       text not null,  -- e.g. "Speaker A"
  name        text not null,  -- user-editable display name
  unique (meeting_id, label)
);

alter table public.speakers enable row level security;

create policy "Users can manage own speakers"
  on public.speakers
  for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id
        and m.user_id = auth.uid()
    )
  );

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run via Supabase Dashboard → Storage → New bucket, or via the API:
-- insert into storage.buckets (id, name, public) values ('recordings', 'recordings', true);

-- Storage policy — only owners can upload/download their own recordings
create policy "Authenticated users can upload recordings"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own recordings"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own recordings"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
