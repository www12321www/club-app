-- Paid membership via reference code redemption
-- Run in Supabase SQL editor

alter table members add column if not exists is_paid boolean not null default false;

create table reference_codes (
  code text primary key,
  used_by uuid references members (id),
  used_at timestamptz
);

alter table reference_codes enable row level security;

create policy "admin manages reference codes" on reference_codes
  for all using (is_admin()) with check (is_admin());

create or replace function redeem_reference_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code reference_codes;
begin
  select * into v_code from reference_codes where code = p_code for update;

  if v_code.code is null then
    raise exception 'Invalid reference code';
  end if;

  if v_code.used_by is not null then
    raise exception 'This reference code has already been used';
  end if;

  update reference_codes set used_by = auth.uid(), used_at = now() where code = p_code;
  update members set is_paid = true where id = auth.uid();
end;
$$;
