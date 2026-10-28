-- Execute once in a NEW Supabase project, using SQL Editor.
-- No secret/service-role key is used in the frontend.
begin;
create table public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to authenticated;
create policy "Members can check their own access" on public.team_members
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.valid_study_tasks(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; i integer; expected_ids text[] := array['filter','view','apply'];
begin
  if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) <> 3 then return false; end if;
  for i in 0..2 loop
    item := value->i;
    if not coalesce(jsonb_typeof(item) = 'object'
      and item->>'id' = expected_ids[i+1]
      and item->>'status' in ('pending','active','completed','skipped')
      and jsonb_typeof(item->'help_count') = 'number'
      and (item->>'help_count')::numeric between 0 and 100000
      and (item->>'help_count')::numeric = trunc((item->>'help_count')::numeric)
      and ((item->>'status' in ('pending','active') and item->'duration_ms' = 'null'::jsonb)
        or (item->>'status' in ('completed','skipped') and jsonb_typeof(item->'duration_ms') = 'number'
          and (item->>'duration_ms')::numeric between 0 and 31536000000))
      and ((item->>'status' = 'pending' and item->'started_at' = 'null'::jsonb)
        or (item->>'status' <> 'pending' and jsonb_typeof(item->'started_at') = 'string')), false)
      then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

create table public.study_sessions (
  id uuid primary key,
  revision integer not null default 1 check (revision >= 1),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  participant_name text not null check (length(trim(participant_name)) between 1 and 80),
  course text not null check (length(trim(course)) between 1 and 100),
  consent boolean not null check (consent = true),
  consent_version text not null check (consent_version = '2026-10-v1'),
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('in_progress', 'completed')),
  tasks jsonb not null check (public.valid_study_tasks(tasks)),
  events jsonb not null default '[]' check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 500),
  feedback jsonb,
  check ((status = 'in_progress' and completed_at is null and feedback is null)
    or (status = 'completed' and completed_at is not null and feedback is not null
      and jsonb_typeof(feedback) = 'object'
      and tasks->0->>'status' in ('completed','skipped')
      and tasks->1->>'status' in ('completed','skipped')
      and tasks->2->>'status' in ('completed','skipped')
      and feedback ? 'ease' and jsonb_typeof(feedback->'ease') = 'number'
      and (feedback->>'ease')::numeric in (1,2,3,4,5))),
  check (completed_at is null or completed_at >= started_at),
  check (octet_length(tasks::text) < 10000 and octet_length(events::text) < 200000),
  check (feedback is null or (jsonb_typeof(feedback->'comment') = 'string' and length(feedback->>'comment') <= 1500))
);
alter table public.study_sessions enable row level security;
revoke all on public.study_sessions from anon, authenticated;
grant select, insert, update on public.study_sessions to authenticated;

create policy "Participant inserts own session" on public.study_sessions
  for insert to authenticated with check (
    (select auth.uid()) = owner_id and (select (auth.jwt()->>'is_anonymous')::boolean) = true
  );
create policy "Participant updates own session" on public.study_sessions
  for update to authenticated using (
    (select auth.uid()) = owner_id and (select (auth.jwt()->>'is_anonymous')::boolean) = true
  ) with check (
    (select auth.uid()) = owner_id and (select (auth.jwt()->>'is_anonymous')::boolean) = true
  );
create policy "Owner and team can read" on public.study_sessions
  for select to authenticated using (
    (select auth.uid()) = owner_id or (
      coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false
      and exists (select 1 from public.team_members where user_id = (select auth.uid()))
    )
  );
create index study_sessions_started_at_idx on public.study_sessions(started_at desc);
-- Compare-and-swap keeps simultaneous tabs from overwriting one another.
-- Security invoker: the same RLS and constraints apply to this function.
create function public.save_study_session(payload jsonb, expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare incoming public.study_sessions; existing public.study_sessions; new_revision integer;
begin
  incoming := jsonb_populate_record(null::public.study_sessions, payload);
  if incoming.owner_id is distinct from auth.uid()
    or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Sessão não autorizada.' using errcode = '42501';
  end if;
  select * into existing from public.study_sessions where id = incoming.id for update;
  if found then
    if (to_jsonb(existing) - 'revision') = (to_jsonb(incoming) - 'revision') then
      return existing.revision; -- safe retry after a lost response
    end if;
    if expected_revision is distinct from existing.revision then
      raise exception 'Esta participação foi alterada em outra aba.' using errcode = '40001';
    end if;
    update public.study_sessions set participant_name=incoming.participant_name,
      course=incoming.course, consent=incoming.consent, consent_version=incoming.consent_version,
      started_at=incoming.started_at, completed_at=incoming.completed_at, status=incoming.status,
      tasks=incoming.tasks, events=incoming.events, feedback=incoming.feedback,
      revision=existing.revision+1
      where id=incoming.id and owner_id=auth.uid()
      returning revision into new_revision;
    return new_revision;
  end if;
  if expected_revision is distinct from 0 then
    raise exception 'Esta participação foi alterada em outra aba.' using errcode = '40001';
  end if;
  incoming.revision := 1;
  insert into public.study_sessions select (incoming).*;
  return 1;
end; $$;
revoke all on function public.save_study_session(jsonb,integer) from public, anon;
grant execute on function public.save_study_session(jsonb,integer) to authenticated;
commit;
