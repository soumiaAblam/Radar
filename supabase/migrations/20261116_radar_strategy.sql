-- Diario y laboratorio de Radar. No modifica los objetivos ni los diagnósticos existentes.
create table public.radar_experiments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  hypothesis text not null default '', rationale text not null default '', evidence text not null default '',
  action text not null default '', metric text not null default '',
  starts_on date, review_on date,
  status text not null default 'proposed' check (status in ('proposed','planned','running','evaluation','completed','discarded')),
  source text not null default 'user' check (source in ('user','radar','ai','general')),
  source_key text, priority text not null default 'media' check (priority in ('alta','media','baja')),
  observed_result text not null default '', conclusion text not null default '',
  outcome text check (outcome in ('supported','inconclusive','not_supported')),
  publication_id uuid references public.media_metrics(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, account_id)
);
create unique index radar_experiments_source_unique on public.radar_experiments(account_id, source_key) where source_key is not null;

create table public.radar_actions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  title text not null check (length(title) between 1 and 160), description text not null default '',
  category text not null default 'analizar' check (category in ('analizar','crear','publicar','experimentar','optimizar','revisar')),
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  due_on date not null, status text not null default 'pending' check (status in ('pending','done','discarded')),
  source text not null default 'user' check (source in ('user','radar','ai','general')),
  source_key text, evidence text not null default '', metric text not null default '',
  experiment_id uuid, recurrence text not null default 'none' check (recurrence in ('none','daily','weekly')),
  series_id uuid, is_recurrence boolean not null default false, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint radar_action_experiment_account_fk foreign key (experiment_id, account_id) references public.radar_experiments(id, account_id),
  unique (account_id, series_id, due_on)
);
create unique index radar_actions_source_unique on public.radar_actions(account_id, source_key) where source_key is not null;
create table public.radar_activity (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  kind text not null, description text not null, item_id uuid, happened_at timestamptz not null default now()
);
create index radar_activity_account_date on public.radar_activity(account_id, happened_at desc);

alter table public.radar_actions enable row level security;
alter table public.radar_experiments enable row level security;
alter table public.radar_activity enable row level security;
create policy "Owner manages radar actions" on public.radar_actions for all to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "Owner manages radar experiments" on public.radar_experiments for all to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "Owner reads radar activity" on public.radar_activity for select to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
revoke all on public.radar_actions, public.radar_experiments from anon, authenticated;
grant select, insert, update on public.radar_actions, public.radar_experiments to authenticated;
revoke all on public.radar_activity from anon, authenticated;
grant select on public.radar_activity to authenticated;

create or replace function public.radar_validate_experiment_publication() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.publication_id is not null and not exists (select 1 from public.media_metrics m where m.id = new.publication_id and m.account_id = new.account_id) then
    raise exception 'La publicación debe pertenecer a la misma cuenta';
  end if;
  return new;
end $$;
create trigger radar_experiment_publication_check before insert or update of publication_id, account_id on public.radar_experiments for each row execute function public.radar_validate_experiment_publication();

-- Los eventos y la siguiente recurrencia se crean en la misma transacción.
create or replace function public.radar_record_action() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' and new.source in ('radar','ai','general') and not new.is_recurrence then
    insert into public.radar_activity(account_id,kind,description,item_id) values (new.account_id,'action_created','Recomendación añadida al plan: ' || new.title,new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'done' then
    insert into public.radar_activity(account_id,kind,description,item_id) values (new.account_id,'action_completed','Acción completada: ' || new.title,new.id);
    if new.recurrence <> 'none' and new.series_id is not null then
      insert into public.radar_actions(account_id,title,description,category,priority,due_on,source,evidence,metric,experiment_id,recurrence,series_id,is_recurrence)
      values (new.account_id,new.title,new.description,new.category,new.priority,new.due_on + case when new.recurrence = 'daily' then 1 else 7 end,new.source,new.evidence,new.metric,new.experiment_id,new.recurrence,new.series_id,true)
      on conflict (account_id,series_id,due_on) do nothing;
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'done' and new.status = 'pending' then
    insert into public.radar_activity(account_id,kind,description,item_id) values (new.account_id,'action_reopened','Acción reabierta: ' || new.title,new.id);
  end if;
  return new;
end $$;
create trigger radar_actions_events after insert or update on public.radar_actions for each row execute function public.radar_record_action();

create or replace function public.radar_record_experiment() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'running' then
    insert into public.radar_activity(account_id,kind,description,item_id) values (new.account_id,'experiment_started','Experimento iniciado: ' || new.title,new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'completed' then
    insert into public.radar_activity(account_id,kind,description,item_id) values (new.account_id,'experiment_evaluated','Experimento evaluado: ' || new.title,new.id);
  end if;
  return new;
end $$;
create trigger radar_experiment_events after update on public.radar_experiments for each row execute function public.radar_record_experiment();

create or replace function public.radar_record_diagnosis() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'ready' and new.generated_at is not null then
    if tg_op = 'INSERT' then
      insert into public.radar_activity(account_id,kind,description,item_id,happened_at) values (new.account_id,'ai_generated','Análisis estratégico con IA generado',new.id,new.generated_at);
    elsif old.generated_at is distinct from new.generated_at then
      insert into public.radar_activity(account_id,kind,description,item_id,happened_at) values (new.account_id,'ai_generated','Análisis estratégico con IA generado',new.id,new.generated_at);
    end if;
  end if;
  return new;
exception when others then
  -- Un fallo del historial nunca debe impedir guardar el diagnóstico existente.
  raise warning 'No se pudo registrar el evento del diagnóstico: %', sqlstate;
  return new;
end $$;
create trigger radar_diagnosis_events after insert or update on public.weekly_diagnoses for each row execute function public.radar_record_diagnosis();
