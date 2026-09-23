-- Run in the SQL editor of a new Supabase project.
-- This script creates a private, invitation-based shared expense app.
create table if not exists public.expense_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  invite_code uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expense_members (
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  email text not null,
  role text not null check (role in ('owner', 'member')),
  status text not null check (status in ('pending', 'active')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create unique index if not exists expense_members_active_names
  on public.expense_members (group_id, lower(display_name)) where status = 'active';

create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 160),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  spent_on date not null,
  category text not null check (category in ('Cibo', 'Carburante', 'Bar', 'Alloggio', 'Pedaggi', 'Altro')),
  paid_by uuid not null references auth.users(id),
  split_between uuid[] not null check (cardinality(split_between) > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  legacy_key text
);
create index if not exists shared_expenses_group_date on public.shared_expenses (group_id, spent_on desc);
create unique index if not exists shared_expenses_legacy_key on public.shared_expenses (group_id, legacy_key)
  where legacy_key is not null;

create table if not exists public.expense_events (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  expense_id uuid not null references public.shared_expenses(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('added', 'edited', 'deleted', 'restored')),
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists expense_events_group_time on public.expense_events (group_id, occurred_at desc);

-- These helper functions inspect membership without recursively invoking its RLS policy.
create or replace function public.is_expense_member(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.expense_members
    where group_id = p_group and user_id = (select auth.uid()) and status = 'active');
$$;
create or replace function public.has_expense_membership(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.expense_members
    where group_id = p_group and user_id = (select auth.uid()));
$$;
create or replace function public.owns_expense_group(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.expense_members
    where group_id = p_group and user_id = (select auth.uid())
      and role = 'owner' and status = 'active');
$$;

alter table public.expense_groups enable row level security;
alter table public.expense_members enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.expense_events enable row level security;

create policy "Members see their groups" on public.expense_groups for select to authenticated
  using (public.has_expense_membership(id));
create policy "Members see group members and their own request" on public.expense_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_expense_member(group_id));
create policy "Members see their group expenses" on public.shared_expenses for select to authenticated
  using (public.is_expense_member(group_id));
create policy "Members see their group history" on public.expense_events for select to authenticated
  using (public.is_expense_member(group_id));

-- The invitation code is never returned by ordinary SELECT queries.
revoke all on public.expense_groups, public.expense_members, public.shared_expenses, public.expense_events from public, anon, authenticated;
grant select (id, name, created_by, created_at) on public.expense_groups to authenticated;
grant select on public.expense_members, public.shared_expenses, public.expense_events to authenticated;

create or replace function public.create_expense_group(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or length(trim(coalesce(p_name, ''))) not between 1 and 80
      or length(trim(coalesce(p_display_name, ''))) not between 1 and 60 then
    raise exception 'Nome del gruppo o del partecipante non valido';
  end if;
  insert into public.expense_groups(name, created_by) values (trim(p_name), v_user) returning id into v_id;
  insert into public.expense_members(group_id, user_id, display_name, email, role, status)
    values (v_id, v_user, trim(p_display_name), coalesce(auth.jwt()->>'email', ''), 'owner', 'active');
  return v_id;
end;
$$;

create or replace function public.request_expense_membership(p_code uuid, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or length(trim(coalesce(p_display_name, ''))) not between 1 and 60 then
    raise exception 'Effettua l’accesso e inserisci il tuo nome';
  end if;
  select id into v_id from public.expense_groups where invite_code = p_code;
  if v_id is null then raise exception 'Invito non valido'; end if;
  insert into public.expense_members(group_id, user_id, display_name, email, role, status)
    values (v_id, v_user, trim(p_display_name), coalesce(auth.jwt()->>'email', ''), 'member', 'pending')
    on conflict (group_id, user_id) do nothing;
  return v_id;
end;
$$;

create or replace function public.approve_expense_member(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.owns_expense_group(p_group) then raise exception 'Solo chi amministra il gruppo può approvare'; end if;
  update public.expense_members set status = 'active'
    where group_id = p_group and user_id = p_user and status = 'pending';
  if not found then raise exception 'Richiesta non trovata'; end if;
end;
$$;

create or replace function public.expense_invite_code(p_group uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.owns_expense_group(p_group) then raise exception 'Accesso negato'; end if;
  select invite_code::text into v_code from public.expense_groups where id = p_group;
  return v_code;
end;
$$;

create or replace function public.validate_expense_split(p_group uuid, p_people uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_people is null or cardinality(p_people) = 0 then raise exception 'Scegli almeno un partecipante'; end if;
  select count(distinct user_id) into v_count from public.expense_members
    where group_id = p_group and status = 'active' and user_id = any(p_people);
  if v_count <> cardinality(p_people) then raise exception 'Seleziona solo partecipanti attivi, senza duplicati'; end if;
end;
$$;

create or replace function public.add_shared_expense(
  p_group uuid, p_description text, p_amount_cents integer, p_spent_on date,
  p_category text, p_split_between uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_expense_member(p_group) then raise exception 'Accesso negato'; end if;
  perform public.validate_expense_split(p_group, p_split_between);
  insert into public.shared_expenses(group_id, description, amount_cents, spent_on,
    category, paid_by, split_between, created_by, updated_by)
    values(p_group, trim(p_description), p_amount_cents, p_spent_on,
      p_category, v_user, p_split_between, v_user, v_user) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.edit_shared_expense(
  p_id uuid, p_description text, p_amount_cents integer, p_spent_on date,
  p_category text, p_split_between uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_exp public.shared_expenses%rowtype; v_user uuid := auth.uid();
begin
  select * into v_exp from public.shared_expenses where id = p_id for update;
  if v_exp.id is null or v_exp.deleted_at is not null or
      not (v_exp.created_by = v_user or public.owns_expense_group(v_exp.group_id)) then
    raise exception 'Non puoi modificare questa spesa';
  end if;
  perform public.validate_expense_split(v_exp.group_id, p_split_between);
  update public.shared_expenses set description = trim(p_description), amount_cents = p_amount_cents,
    spent_on = p_spent_on, category = p_category, split_between = p_split_between,
    updated_by = v_user, updated_at = now() where id = p_id;
end;
$$;

-- The group owner maps names in an old local backup to approved accounts.
-- Import time and actor are recorded honestly; original authors cannot be inferred from local data.
create or replace function public.import_legacy_expense(
  p_group uuid, p_legacy_key text, p_description text, p_amount_cents integer,
  p_spent_on date, p_category text, p_paid_by uuid, p_split_between uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if not public.owns_expense_group(p_group) then raise exception 'Solo chi amministra può importare le vecchie spese'; end if;
  if length(coalesce(p_legacy_key, '')) not between 1 and 200 then raise exception 'Identificativo importazione non valido'; end if;
  perform public.validate_expense_split(p_group, p_split_between);
  if not exists(select 1 from public.expense_members where group_id = p_group and user_id = p_paid_by and status = 'active') then
    raise exception 'Il pagatore deve essere un partecipante approvato';
  end if;
  insert into public.shared_expenses(group_id, legacy_key, description, amount_cents, spent_on,
    category, paid_by, split_between, created_by, updated_by)
    values(p_group, p_legacy_key, trim(p_description), p_amount_cents, p_spent_on,
      p_category, p_paid_by, p_split_between, v_user, v_user)
    on conflict (group_id, legacy_key) where legacy_key is not null do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.shared_expenses where group_id = p_group and legacy_key = p_legacy_key; end if;
  return v_id;
end;
$$;

create or replace function public.delete_shared_expense(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_exp public.shared_expenses%rowtype; v_user uuid := auth.uid();
begin
  select * into v_exp from public.shared_expenses where id = p_id for update;
  if v_exp.id is null or not (v_exp.created_by = v_user or public.owns_expense_group(v_exp.group_id)) then
    raise exception 'Non puoi eliminare questa spesa';
  end if;
  if v_exp.deleted_at is null then
    update public.shared_expenses set deleted_at = now(), deleted_by = v_user,
      updated_by = v_user, updated_at = now() where id = p_id;
  end if;
end;
$$;

create or replace function public.restore_shared_expense(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_exp public.shared_expenses%rowtype; v_user uuid := auth.uid();
begin
  select * into v_exp from public.shared_expenses where id = p_id for update;
  if v_exp.id is null or not (v_exp.created_by = v_user or public.owns_expense_group(v_exp.group_id)) then
    raise exception 'Non puoi ripristinare questa spesa';
  end if;
  if v_exp.deleted_at is not null then
    update public.shared_expenses set deleted_at = null, deleted_by = null,
      updated_by = v_user, updated_at = now() where id = p_id;
  end if;
end;
$$;

create or replace function public.log_shared_expense()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'added';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_action := 'deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_action := 'restored';
  else
    v_action := 'edited';
  end if;
  insert into public.expense_events(group_id, expense_id, actor_id, action, before_state, after_state)
    values(new.group_id, new.id, auth.uid(), v_action,
      case when tg_op = 'INSERT' then null else to_jsonb(old) end, to_jsonb(new));
  return new;
end;
$$;
create trigger audit_shared_expenses after insert or update on public.shared_expenses
  for each row execute function public.log_shared_expense();

-- SECURITY DEFINER functions must not remain executable by the public or signed-out visitors.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_expense_member(uuid), public.has_expense_membership(uuid),
  public.owns_expense_group(uuid), public.create_expense_group(text,text),
  public.request_expense_membership(uuid,text), public.approve_expense_member(uuid,uuid),
  public.expense_invite_code(uuid),
  public.add_shared_expense(uuid,text,integer,date,text,uuid[]),
  public.edit_shared_expense(uuid,text,integer,date,text,uuid[]),
  public.import_legacy_expense(uuid,text,text,integer,date,text,uuid,uuid[]),
  public.delete_shared_expense(uuid), public.restore_shared_expense(uuid) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_expenses') then
    alter publication supabase_realtime add table public.shared_expenses;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_events') then
    alter publication supabase_realtime add table public.expense_events;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_members') then
    alter publication supabase_realtime add table public.expense_members;
  end if;
end $$;
