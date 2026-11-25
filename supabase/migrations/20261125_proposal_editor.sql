-- Las propuestas guardadas siguen pendientes hasta que se autoricen expresamente.
alter table public.editorial_content add column if not exists media_kind text not null default 'video' check (media_kind in ('video', 'image'));
alter table public.ai_content_proposals add column if not exists editing_in_progress boolean not null default false;
alter table public.ai_content_proposals add column if not exists editorial_content_id uuid references public.editorial_content(id) on delete set null;

create or replace function public.check_proposal_editorial_content_account()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.editorial_content_id is not null and not exists (
    select 1 from public.editorial_content c where c.id = new.editorial_content_id and c.account_id = new.account_id
  ) then
    raise exception 'El contenido seleccionado no pertenece a esta cuenta.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger check_proposal_editorial_content_account
  before insert or update of editorial_content_id, account_id on public.ai_content_proposals
  for each row execute function public.check_proposal_editorial_content_account();

grant update (editing_in_progress, editorial_content_id) on public.ai_content_proposals to authenticated;
