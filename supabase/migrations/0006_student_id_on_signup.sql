-- Save Kent ID (student_id) captured at sign up time
-- Run in Supabase SQL editor

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into members (id, name, student_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'student_id'
  );
  return new;
end;
$$;
