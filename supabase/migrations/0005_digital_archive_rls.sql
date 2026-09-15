-- ============================================================
-- ضماني — الملف 5: صلاحيات RLS لجدول documents
-- ============================================================

alter table documents enable row level security;

create policy "documents_select_scoped"
  on documents for select
  to authenticated
  using (
    citizen_id = current_citizen_id()
    or exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = documents.branch_id
    )
  );

create policy "documents_employee_insert"
  on documents for insert
  to authenticated
  with check (
    exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = documents.branch_id
    )
  );

create policy "documents_employee_update"
  on documents for update
  to authenticated
  using (
    exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id = documents.branch_id
    )
  );
