-- Run once in the Supabase SQL Editor for gestione-spese-ezio.
-- This endpoint returns only a constant: no group, user, or expense data.
create or replace function public.expense_healthcheck()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

revoke all on function public.expense_healthcheck() from public, authenticated;
grant execute on function public.expense_healthcheck() to anon;
