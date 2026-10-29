-- L'archiviazione separa i viaggi senza impedirne le correzioni successive.
alter table public.expense_groups add column if not exists closed_at timestamptz;
grant select(closed_at) on public.expense_groups to authenticated;

create or replace function public.create_followup_expense_group(p_group uuid, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid; v_previous uuid;
begin
  if v_user is null or not public.owns_expense_group(p_group) then
    raise exception 'Solo chi amministra il gruppo può aprire il viaggio successivo';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'Il nome del nuovo viaggio deve contenere da 1 a 80 caratteri';
  end if;
  select id into v_previous from public.expense_groups
    where id = p_group and closed_at is null for update;
  if v_previous is null then raise exception 'Questo viaggio è già archiviato'; end if;

  insert into public.expense_groups(name,created_by)
    values(trim(p_name),v_user) returning id into v_id;
  insert into public.expense_members(group_id,user_id,display_name,email,role,status)
    select v_id,user_id,display_name,email,
      case when user_id = v_user then 'owner' else 'member' end,'active'
    from public.expense_members where group_id = p_group and status = 'active';
  update public.expense_groups set closed_at = now() where id = p_group;
  return v_id;
end;
$$;
revoke execute on function public.create_followup_expense_group(uuid,text) from public, anon;
grant execute on function public.create_followup_expense_group(uuid,text) to authenticated;