-- Apply after 20260924_invite_first.sql on the existing project.
-- Deletion cascades to members, expenses, and the expense audit history.
create or replace function public.delete_expense_group(p_group uuid, p_confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_group public.expense_groups%rowtype;
begin
  select * into v_group from public.expense_groups where id = p_group for update;
  if v_group.id is null or v_group.created_by is distinct from auth.uid()
      or not public.owns_expense_group(p_group) then
    raise exception 'Solo chi ha creato il gruppo può eliminarlo';
  end if;
  if p_confirmation is distinct from v_group.name then
    raise exception 'Scrivi il nome esatto del gruppo per confermare';
  end if;
  delete from public.expense_groups where id = p_group;
end;
$$;

revoke execute on function public.delete_expense_group(uuid,text) from public, anon;
grant execute on function public.delete_expense_group(uuid,text) to authenticated;
