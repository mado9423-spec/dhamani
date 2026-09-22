-- Dhamani: branch activation + PIN login for citizens. Dhamani-specific; NOT part of the shared core.

create table public.citizen_credentials (
  citizen_id uuid primary key references public.citizens(id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.citizen_activation_codes (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.citizens(id) on delete cascade,
  code_hash text not null,
  created_by_employee_id uuid not null references public.employees(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  attempts int not null default 0
);
create index citizen_activation_codes_open_idx
  on public.citizen_activation_codes (citizen_id)
  where used_at is null and revoked_at is null;

create table public.auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
create index auth_attempts_key_time_idx on public.auth_attempts (key, attempted_at desc);

alter table public.citizen_credentials enable row level security;
alter table public.citizen_activation_codes enable row level security;
alter table public.auth_attempts enable row level security;
-- no policies on purpose: reachable only through the SECURITY DEFINER functions below
revoke all on table public.citizen_credentials, public.citizen_activation_codes, public.auth_attempts from anon, authenticated;
revoke all on sequence public.auth_attempts_id_seq from anon, authenticated;

-- weak PIN detector
create or replace function public.pin_is_weak(p_pin text)
returns boolean language sql immutable set search_path = public as $$
  select p_pin ~ '^(\d)\1{5}$'
      or p_pin ~ '^(\d\d)\1\1$'
      or p_pin ~ '^(\d{3})\1$'
      or p_pin in ('012345','123456','234567','345678','456789','567890',
                   '987654','876543','765432','654321','543210','098765');
$$;

-- Employee issues a one-time activation code for a citizen of his own branch (admin: any branch)
create or replace function public.issue_citizen_activation_code(p_citizen_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_emp uuid; v_role text; v_branch uuid;
  v_cit_branch uuid; v_status text;
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := gen_random_bytes(8);
  v_code text := '';
  v_exp timestamptz := now() + interval '72 hours';
  i int;
begin
  select ce.employee_id, ce.role, ce.branch_id into v_emp, v_role, v_branch
  from public.current_employee() ce limit 1;
  if v_emp is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select branch_id, status into v_cit_branch, v_status from public.citizens where id = p_citizen_id;
  if not found then
    raise exception 'citizen_not_found' using errcode = 'P0002';
  end if;
  if v_role <> 'admin' and v_cit_branch is distinct from v_branch then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_status <> 'active' then
    raise exception 'citizen_not_active' using errcode = 'P0001';
  end if;

  for i in 0..7 loop
    v_code := v_code || substr(v_alpha, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;

  update public.citizen_activation_codes
     set revoked_at = now()
   where citizen_id = p_citizen_id and used_at is null and revoked_at is null;

  insert into public.citizen_activation_codes (citizen_id, code_hash, created_by_employee_id, expires_at)
  values (p_citizen_id, crypt(v_code, gen_salt('bf', 8)), v_emp, v_exp);

  insert into public.audit_logs (actor_id, actor_type, action, table_name, record_id, new_data)
  values (v_emp, case when v_role = 'admin' then 'admin' else 'employee' end,
          'issue_activation_code', 'citizen_activation_codes', p_citizen_id,
          jsonb_build_object('expires_at', v_exp));

  return jsonb_build_object('code', substr(v_code,1,4) || '-' || substr(v_code,5,4), 'expires_at', v_exp);
end;
$$;

-- Citizen sets his PIN using the activation code (called only by the edge function via service_role)
create or replace function public.citizen_activate(p_pension text, p_code text, p_pin text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pn text := btrim(coalesce(p_pension, ''));
  v_ip text := 'ip:' || coalesce(nullif(btrim(p_ip), ''), 'unknown');
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_cit record; v_ac record;
begin
  if random() < 0.01 then
    delete from public.auth_attempts where attempted_at < now() - interval '7 days';
  end if;

  if (select count(*) from public.auth_attempts
       where key = v_ip and success = false and attempted_at > now() - interval '15 minutes') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  if v_pn = '' or v_code !~ '^[A-Z0-9]{8}$' or coalesce(p_pin, '') !~ '^[0-9]{6}$' then
    perform crypt('x', gen_salt('bf', 8));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id, auth_user_id, status into v_cit from public.citizens where pension_number = v_pn;
  if not found or v_cit.status <> 'active' then
    perform crypt('x', gen_salt('bf', 8));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into v_ac from public.citizen_activation_codes
   where citizen_id = v_cit.id and used_at is null and revoked_at is null and expires_at > now()
   order by created_at desc limit 1
   for update;
  if not found then
    perform crypt('x', gen_salt('bf', 8));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_ac.attempts >= 5 then
    update public.citizen_activation_codes set revoked_at = now() where id = v_ac.id;
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_ac.code_hash <> crypt(v_code, v_ac.code_hash) then
    update public.citizen_activation_codes set attempts = attempts + 1 where id = v_ac.id;
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if public.pin_is_weak(p_pin) then
    return jsonb_build_object('ok', false, 'reason', 'weak_pin');
  end if;

  insert into public.citizen_credentials (citizen_id, pin_hash, pin_set_at, failed_attempts, locked_until)
  values (v_cit.id, crypt(p_pin, gen_salt('bf', 10)), now(), 0, null)
  on conflict (citizen_id) do update
    set pin_hash = excluded.pin_hash, pin_set_at = now(), failed_attempts = 0,
        locked_until = null, updated_at = now();

  update public.citizen_activation_codes set used_at = now() where id = v_ac.id;
  insert into public.auth_attempts (key, success) values (v_ip, true);
  insert into public.audit_logs (actor_id, actor_type, action, table_name, record_id)
  values (v_cit.auth_user_id, 'citizen', 'pin_activated', 'citizen_credentials', v_cit.id);

  return jsonb_build_object('ok', true, 'citizen_id', v_cit.id, 'auth_user_id', v_cit.auth_user_id);
end;
$$;

-- Citizen login with pension number + PIN (called only by the edge function via service_role)
create or replace function public.citizen_verify_pin(p_pension text, p_pin text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pn text := btrim(coalesce(p_pension, ''));
  v_ip text := 'ip:' || coalesce(nullif(btrim(p_ip), ''), 'unknown');
  v_cit record; v_cred record;
begin
  if random() < 0.01 then
    delete from public.auth_attempts where attempted_at < now() - interval '7 days';
  end if;

  if (select count(*) from public.auth_attempts
       where key = v_ip and success = false and attempted_at > now() - interval '15 minutes') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  if v_pn = '' or coalesce(p_pin, '') !~ '^[0-9]{6}$' then
    perform crypt('x', gen_salt('bf', 10));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id, auth_user_id, status into v_cit from public.citizens where pension_number = v_pn;
  if not found then
    perform crypt('x', gen_salt('bf', 10));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into v_cred from public.citizen_credentials where citizen_id = v_cit.id for update;
  if not found then
    perform crypt('x', gen_salt('bf', 10));
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_cred.locked_until is not null and v_cred.locked_until > now() then
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  if v_cred.pin_hash <> crypt(p_pin, v_cred.pin_hash) then
    update public.citizen_credentials
       set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end,
           updated_at = now()
     where citizen_id = v_cit.id;
    insert into public.auth_attempts (key, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_cit.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  update public.citizen_credentials set failed_attempts = 0, locked_until = null, updated_at = now()
   where citizen_id = v_cit.id;
  insert into public.auth_attempts (key, success) values (v_ip, true);

  return jsonb_build_object('ok', true, 'citizen_id', v_cit.id, 'auth_user_id', v_cit.auth_user_id);
end;
$$;

-- permissions
revoke execute on function public.pin_is_weak(text) from public, anon, authenticated;
revoke execute on function public.citizen_activate(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.citizen_verify_pin(text, text, text) from public, anon, authenticated;
grant execute on function public.citizen_activate(text, text, text, text) to service_role;
grant execute on function public.citizen_verify_pin(text, text, text) to service_role;
revoke execute on function public.issue_citizen_activation_code(uuid) from public, anon;
grant execute on function public.issue_citizen_activation_code(uuid) to authenticated;
