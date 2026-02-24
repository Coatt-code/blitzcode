-- Run this in Supabase SQL Editor so the app can load problems from tests.easy
-- without exposing the tests schema to the REST API (avoids 406).

create or replace function public.get_easy_problem(p_id int)
returns json
language plpgsql
security definer
set search_path = public, tests
as $$
declare
  r record;
begin
  select id, question, input_output, solutions
  into r
  from tests.easy
  where id = p_id;
  if not found then
    return null;
  end if;
  return to_json(r);
end;
$$;
