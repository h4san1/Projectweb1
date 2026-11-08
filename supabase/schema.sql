-- ============================================================================
-- Catat — skema Supabase
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor → Run.
-- Aman dijalankan berulang kali (idempoten).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ tipe
do $$
begin
  create type public.note_kind as enum ('text', 'list', 'drawing', 'photo');
exception
  when duplicate_object then null;
end
$$;

-- ------------------------------------------------------------------ tabel
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        public.note_kind not null default 'text',
  title       text not null default '',
  body        text not null default '',
  items       jsonb not null default '[]'::jsonb,
  media_path  text,
  color       text not null default '#ffffff',
  pinned      boolean not null default false,
  archived    boolean not null default false,
  trashed     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint notes_title_length check (char_length(title) <= 200),
  constraint notes_items_is_array check (jsonb_typeof(items) = 'array')
);

create index if not exists notes_owner_idx
  on public.notes (user_id, trashed, archived, pinned desc, updated_at desc);

-- --------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row
  execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS
alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------- storage: media
-- Bucket privat. Gambar hanya bisa dibaca lewat signed URL milik pemiliknya.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "media_select_own" on storage.objects;
create policy "media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_insert_own" on storage.objects;
create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================================
-- Selesai. Struktur folder storage:
--   media/<user_id>/<uuid>.png   → gambar kanvas
--   media/<user_id>/<uuid>.jpg   → foto yang diunggah
-- ============================================================================
