-- Run this in Supabase SQL Editor so the app can load problems from tests.mbpp
-- without exposing the tests schema to the REST API (avoids 406).

create or replace function public.get_mbpp_problem(p_id int)
returns json
language plpgsql
security definer
set search_path = public, tests
as $$
declare
  r record;
begin
  select id, text, code, task_id, test_list
  into r
  from tests.mbpp
  where id = p_id;
  if not found then
    return null;
  end if;
  return to_json(r);
end;
$$;
