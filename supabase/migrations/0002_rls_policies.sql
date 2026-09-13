create or replace function current_employee()
returns table (employee_id uuid, role text, branch_id uuid)
language sql
security definer
stable
as $$
  select id, role, branch_id
  from employees
  where auth_user_id = auth.uid()
    and is_active = true;
$$;

create or replace function current_citizen_id()
returns uuid
language sql
security definer
stable
as $$
  select id from citizens where auth_user_id = auth.uid();
$$;

alter table branches enable row level security;
alter table citizens enable row level security;
alter table employees enable row level security;
alter table transaction_types enable row level security;
alter table transactions enable row level security;
alter table military_transactions enable row level security;
alter table appointments enable row level security;
alter table annual_declarations enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

create policy "branches_select_all_authenticated"
  on branches for select
  to authenticated
  using (true);

create policy "citizens_select_own"
  on citizens for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or (ce.role in ('employee', 'supervisor') and ce.branch_id = citizens.branch_id)
    )
  );

create policy "citizens_update_own"
  on citizens for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "citizens_employee_manage"
  on citizens for update
  to authenticated
  using (
    exists (
      select 1 from current_employee() ce
      where ce.role in ('employee', 'supervisor', 'admin')
        and (ce.role = 'admin' or ce.branch_id = citizens.branch_id)
    )
  );

create policy "employees_select_scoped"
  on employees for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = employees.branch_id
    )
  );

create policy "transaction_types_select_all"
  on transaction_types for select
  to authenticated
  using (true);

create policy "transactions_select_scoped"
  on transactions for select
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = transactions.branch_id
    )
  );

create policy "transactions_employee_insert"
  on transactions for insert
  to authenticated
  with check (
    exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = transactions.branch_id
    )
  );

create policy "transactions_employee_update"
  on transactions for update
  to authenticated
  using (
    exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = transactions.branch_id
    )
  );

create policy "military_transactions_select_scoped"
  on military_transactions for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = military_transactions.transaction_id
        and (
          t.citizen_id = current_citizen_id()
          or exists (
            select 1 from current_employee() ce
            where ce.role = 'admin' or ce.branch_id = t.branch_id
          )
        )
    )
  );

create policy "appointments_select_scoped"
  on appointments for select
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin' or ce.branch_id = appointments.branch_id
    )
  );

create policy "appointments_citizen_insert"
  on appointments for insert
  to authenticated
  with check (citizen_id = current_citizen_id());

create policy "appointments_scoped_update"
  on appointments for update
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin' or ce.branch_id = appointments.branch_id
    )
  );

create policy "declarations_select_scoped"
  on annual_declarations for select
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin' or ce.branch_id = annual_declarations.branch_id
    )
  );

create policy "declarations_citizen_insert"
  on annual_declarations for insert
  to authenticated
  with check (citizen_id = current_citizen_id());

create policy "notifications_select_own"
  on notifications for select
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or employee_id in (select employee_id from current_employee())
  );

create policy "notifications_update_own_read_status"
  on notifications for update
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or employee_id in (select employee_id from current_employee())
  );

create policy "audit_logs_select_supervisors_only"
  on audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from current_employee() ce
      where ce.role in ('supervisor', 'admin')
    )
  );
