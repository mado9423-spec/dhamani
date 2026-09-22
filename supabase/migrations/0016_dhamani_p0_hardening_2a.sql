-- Dhamani P0 hardening (phase 2a). Touches ONLY Dhamani tables/functions; wholesale schema untouched.

-- 1) Remove anon access and dangerous table privileges (RLS remains the main gate)
revoke all on table
  public.branches, public.citizens, public.employees, public.transaction_types,
  public.transactions, public.military_transactions, public.appointments,
  public.annual_declarations, public.notifications, public.audit_logs,
  public.documents, public.employers, public.employer_officers,
  public.employments, public.contribution_rates, public.contributions
from anon;

revoke truncate, trigger, references on table
  public.branches, public.citizens, public.employees, public.transaction_types,
  public.transactions, public.military_transactions, public.appointments,
  public.annual_declarations, public.notifications, public.audit_logs,
  public.documents, public.employers, public.employer_officers,
  public.employments, public.contribution_rates, public.contributions
from authenticated;

-- audit log is append-only for API roles
revoke update, delete on table public.audit_logs from authenticated;

-- 2) Pin search_path on Dhamani SECURITY DEFINER helpers
alter function public.citizen_branch_id(uuid) set search_path = public;
alter function public.employer_branch_id(uuid) set search_path = public;
alter function public.is_citizen_employed_by_caller_officer(uuid) set search_path = public;

-- 3) Helpers must not be callable by anonymous users
revoke execute on function public.current_citizen_id() from public, anon;
revoke execute on function public.current_employee() from public, anon;
revoke execute on function public.citizen_branch_id(uuid) from public, anon;
revoke execute on function public.employer_branch_id(uuid) from public, anon;
revoke execute on function public.is_citizen_employed_by_caller_officer(uuid) from public, anon;

-- 4) A citizen may change only his own phone; employees and service role unaffected
create or replace function public.citizens_guard_self_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if exists (select 1 from public.current_employee()) then
    return new;
  end if;
  if old.auth_user_id is not null and old.auth_user_id = auth.uid() then
    if (to_jsonb(new) - 'phone' - 'updated_at') is distinct from (to_jsonb(old) - 'phone' - 'updated_at') then
      raise exception 'citizen_self_update_restricted: only phone can be changed'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_citizens_guard_self_update on public.citizens;
create trigger trg_citizens_guard_self_update
  before update on public.citizens
  for each row execute function public.citizens_guard_self_update();

-- 5) Server-side audit trail (cannot be skipped by the client)
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_emp uuid;
  v_role text;
  v_actor uuid;
  v_actor_type text;
  v_old jsonb;
  v_new jsonb;
  v_rec uuid;
begin
  select ce.employee_id, ce.role into v_emp, v_role
  from public.current_employee() ce limit 1;

  if v_emp is not null then
    v_actor := v_emp;
    v_actor_type := case when v_role = 'admin' then 'admin' else 'employee' end;
  elsif v_uid is not null then
    v_actor := v_uid;
    v_actor_type := 'citizen';
  else
    v_actor := null;
    v_actor_type := 'system';
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_rec := new.id;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_rec := old.id;
  else
    select jsonb_object_agg(n.key, n.value), jsonb_object_agg(n.key, o.value)
      into v_new, v_old
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key <> 'updated_at';
    if v_new is null then
      return null;
    end if;
    v_rec := new.id;
  end if;

  insert into public.audit_logs (actor_id, actor_type, action, table_name, record_id, old_data, new_data)
  values (v_actor, v_actor_type, lower(tg_op), tg_table_name, v_rec, v_old, v_new);

  return null;
end;
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'citizens','transactions','military_transactions','appointments',
    'annual_declarations','documents','employees','employers',
    'employer_officers','employments','contributions','contribution_rates'
  ] loop
    execute format('drop trigger if exists trg_audit_row_change on public.%I', t);
    execute format(
      'create trigger trg_audit_row_change after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;
