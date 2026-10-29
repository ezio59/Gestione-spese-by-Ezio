-- Rimborsi registrati separatamente dalle spese: gli importi delle categorie restano invariati.
create table if not exists public.expense_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  from_user uuid not null references auth.users(id),
  to_user uuid not null references auth.users(id),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  paid_on date not null,
  note text not null default '' check (length(note) <= 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  constraint expense_settlements_different_people check (from_user <> to_user)
);
create index if not exists expense_settlements_group_date on public.expense_settlements(group_id, paid_on desc);
alter table public.expense_settlements enable row level security;
revoke all on public.expense_settlements from public, anon, authenticated;
grant select on public.expense_settlements to authenticated;
create policy "Active group members see settlements"
  on public.expense_settlements for select to authenticated
  using (public.is_expense_member(group_id));

create or replace function public.record_expense_settlement(
 p_group uuid, p_from_user uuid, p_to_user uuid, p_amount_cents integer,
 p_paid_on date, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid; v_people integer;
begin
  if v_user is null or not public.is_expense_member(p_group) then
    raise exception 'Accesso al gruppo non autorizzato';
  end if;
  if p_from_user is null or p_to_user is null or p_from_user = p_to_user
     or p_amount_cents is null or p_amount_cents not between 1 and 100000000
     or p_paid_on is null or length(coalesce(p_note, '')) > 160 then
    raise exception 'Dati del rimborso non validi';
  end if;
  if v_user <> p_from_user and v_user <> p_to_user and not public.owns_expense_group(p_group) then
    raise exception 'Puoi registrare solo i tuoi rimborsi';
  end if;
  select count(*) into v_people from public.expense_members
    where group_id = p_group and status = 'active'
      and user_id in (p_from_user,p_to_user);
  if v_people <> 2 then raise exception 'Seleziona due partecipanti attivi del gruppo'; end if;
  insert into public.expense_settlements
    (group_id,from_user,to_user,amount_cents,paid_on,note,created_by)
  values (p_group,p_from_user,p_to_user,p_amount_cents,p_paid_on,trim(coalesce(p_note,'')),v_user)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.void_expense_settlement(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_item public.expense_settlements%rowtype; v_user uuid := auth.uid();
begin
  select * into v_item from public.expense_settlements where id = p_id for update;
  if v_user is null or v_item.id is null or not public.is_expense_member(v_item.group_id)
     or (v_item.created_by <> v_user and not public.owns_expense_group(v_item.group_id)) then
    raise exception 'Non puoi annullare questo rimborso';
  end if;
  if v_item.voided_at is not null then raise exception 'Rimborso già annullato'; end if;
  update public.expense_settlements set voided_at = now(), voided_by = v_user where id = p_id;
end;
$$;

-- Nuovo viaggio: stesso elenco di partecipanti, ma contabilità separata.
-- Il gruppo precedente, con spese e rimborsi, resta integro e modificabile.
create or replace function public.create_followup_expense_group(p_group uuid, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null or not public.owns_expense_group(p_group) then
    raise exception 'Solo chi amministra il gruppo può aprire il viaggio successivo';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'Il nome del nuovo viaggio deve contenere da 1 a 80 caratteri';
  end if;
  insert into public.expense_groups(name,created_by)
    values(trim(p_name),v_user) returning id into v_id;
  insert into public.expense_members(group_id,user_id,display_name,email,role,status)
    select v_id,user_id,display_name,email,
      case when user_id = v_user then 'owner' else 'member' end,'active'
    from public.expense_members where group_id = p_group and status = 'active';
  return v_id;
end;
$$;

revoke execute on function public.record_expense_settlement(uuid,uuid,uuid,integer,date,text),
  public.void_expense_settlement(uuid), public.create_followup_expense_group(uuid,text)
  from public, anon;
grant execute on function public.record_expense_settlement(uuid,uuid,uuid,integer,date,text),
  public.void_expense_settlement(uuid), public.create_followup_expense_group(uuid,text)
  to authenticated;

do $$ begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'expense_settlements'
  ) then
    alter publication supabase_realtime add table public.expense_settlements;
  end if;
end $$;