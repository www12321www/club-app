-- Update error messages to English (run in Supabase SQL editor)

create or replace function redeem_reward(p_reward_id uuid, p_member_id uuid)
returns redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward rewards;
  v_member members;
  v_redemption redemptions;
begin
  select * into v_reward from rewards where id = p_reward_id for update;
  select * into v_member from members where id = p_member_id for update;

  if v_reward.stock <= 0 then
    raise exception 'This reward is out of stock';
  end if;

  if v_member.points < v_reward.cost then
    raise exception 'Not enough points';
  end if;

  update rewards set stock = stock - 1 where id = p_reward_id;
  update members set points = points - v_reward.cost where id = p_member_id;

  insert into redemptions (member_id, reward_id, status)
  values (p_member_id, p_reward_id, 'fulfilled')
  returning * into v_redemption;

  return v_redemption;
end;
$$;

create or replace function check_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '@gmail\.com$' then
    raise exception 'Only @gmail.com emails are allowed to sign up';
  end if;
  return new;
end;
$$;
