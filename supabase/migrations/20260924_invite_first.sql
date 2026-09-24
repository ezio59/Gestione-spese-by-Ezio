-- Apply once after schema.sql. Existing members and expenses remain intact.
alter table public.shared_expenses add column if not exists category_detail text;

alter table public.shared_expenses drop constraint if exists shared_expenses_category_detail_check;
alter table public.shared_expenses add constraint shared_expenses_category_detail_check
  check (category_detail is null or
    (category = 'Altro' and length(trim(category_detail)) between 1 and 60));

-- The invite code is a private capability. Possessing it admits a signed-in
-- Supabase identity (including an anonymous identity) to this group.
create or replace function public.request_expense_membership(p_code uuid, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or length(trim(coalesce(p_display_name, ''))) not between 1 and 60 then
    raise exception 'Inserisci il tuo nome';
  end if;
  select id into v_id from public.expense_groups where invite_code = p_code;
  if v_id is null then raise exception 'Invito non valido'; end if;
  insert into public.expense_members(group_id, user_id, display_name, email, role, status)
    values (v_id, v_user, trim(p_display_name), coalesce(auth.jwt()->>'email', ''), 'member', 'active')
    on conflict (group_id, user_id) do update set status = 'active'
      where public.expense_members.status = 'pending';
  return v_id;
end;
$$;

create or replace function public.rotate_expense_invite_code(p_group uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.owns_expense_group(p_group) then raise exception 'Accesso negato'; end if;
  update public.expense_groups set invite_code = gen_random_uuid()
    where id = p_group returning invite_code::text into v_code;
  return v_code;
end;
$$;

create or replace function public.add_shared_expense_v2(
  p_group uuid, p_description text, p_amount_cents integer, p_spent_on date,
  p_category text, p_category_detail text, p_split_between uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_expense_member(p_group) then raise exception 'Accesso negato'; end if;
  if p_category = 'Altro' and
      length(trim(coalesce(p_category_detail, ''))) not between 1 and 60 then
    raise exception 'Specifica la voce per Altro';
  end if;
  if p_category <> 'Altro' and nullif(trim(coalesce(p_category_detail, '')), '') is not null then
    raise exception 'La voce libera è disponibile solo per Altro';
  end if;
  perform public.validate_expense_split(p_group, p_split_between);
  insert into public.shared_expenses(group_id, description, amount_cents, spent_on,
    category, category_detail, paid_by, split_between, created_by, updated_by)
    values(p_group, trim(p_description), p_amount_cents, p_spent_on,
      p_category, case when p_category = 'Altro' then trim(p_category_detail) else null end,
      v_user, p_split_between, v_user, v_user) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.edit_shared_expense_v2(
  p_id uuid, p_description text, p_amount_cents integer, p_spent_on date,
  p_category text, p_category_detail text, p_split_between uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_exp public.shared_expenses%rowtype; v_user uuid := auth.uid();
begin
  select * into v_exp from public.shared_expenses where id = p_id for update;
  if v_exp.id is null or v_exp.deleted_at is not null or
      not (v_exp.created_by = v_user or public.owns_expense_group(v_exp.group_id)) then
    raise exception 'Non puoi modificare questa spesa';
  end if;
  if p_category = 'Altro' and
      length(trim(coalesce(p_category_detail, ''))) not between 1 and 60 then
    raise exception 'Specifica la voce per Altro';
  end if;
  if p_category <> 'Altro' and nullif(trim(coalesce(p_category_detail, '')), '') is not null then
    raise exception 'La voce libera è disponibile solo per Altro';
  end if;
  perform public.validate_expense_split(v_exp.group_id, p_split_between);
  update public.shared_expenses set description = trim(p_description), amount_cents = p_amount_cents,
    spent_on = p_spent_on, category = p_category,
    category_detail = case when p_category = 'Altro' then trim(p_category_detail) else null end,
    split_between = p_split_between, updated_by = v_user, updated_at = now() where id = p_id;
end;
$$;

revoke execute on function public.rotate_expense_invite_code(uuid),
  public.add_shared_expense_v2(uuid,text,integer,date,text,text,uuid[]),
  public.edit_shared_expense_v2(uuid,text,integer,date,text,text,uuid[]) from public, anon;
grant execute on function public.rotate_expense_invite_code(uuid),
  public.add_shared_expense_v2(uuid,text,integer,date,text,text,uuid[]),
  public.edit_shared_expense_v2(uuid,text,integer,date,text,text,uuid[]) to authenticated;
