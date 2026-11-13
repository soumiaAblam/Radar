-- Propuestas de IA: siempre requieren revisión humana y nunca publican en Meta.
create table public.ai_content_batches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  generation_date date not null,
  status text not null check (status in ('generating', 'ready', 'error')),
  message text,
  created_at timestamptz not null default now(),
  unique (account_id, generation_date)
);

create table public.ai_content_proposals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  batch_id uuid not null references public.ai_content_batches(id) on delete cascade,
  position integer not null check (position between 1 and 3),
  title text not null,
  description text not null,
  hashtags text not null default '',
  visual_prompt text not null default '',
  image_path text,
  visual_status text not null default 'pending' check (visual_status in ('pending', 'ready', 'unavailable')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'discarded')),
  scheduled_for timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, position)
);

alter table public.ai_content_batches enable row level security;
alter table public.ai_content_proposals enable row level security;
create policy "Owners read proposal batches" on public.ai_content_batches for select to authenticated using (
  exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid())
);
create policy "Owners read proposals" on public.ai_content_proposals for select to authenticated using (
  exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid())
);
create policy "Owners update proposals" on public.ai_content_proposals for update to authenticated using (
  exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid())
) with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
revoke all on public.ai_content_batches, public.ai_content_proposals from anon, authenticated;
grant select on public.ai_content_batches, public.ai_content_proposals to authenticated;
grant update (title, description, hashtags, status, scheduled_for, approved_at, updated_at) on public.ai_content_proposals to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-proposal-visuals', 'ai-proposal-visuals', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy "Owners read proposal visuals" on storage.objects for select to authenticated using (
  bucket_id = 'ai-proposal-visuals' and exists (
    select 1 from public.instagram_accounts a where a.id::text = (storage.foldername(name))[1] and a.user_id = auth.uid()
  )
);
