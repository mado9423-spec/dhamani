-- إصلاح RLS: استبدال السياسات العامة بسياسات تحترم الفرع والدور
-- بنفس نمط current_employee()/current_citizen_id() المستخدم في citizens/transactions
-- + إضافة السياسة المفقودة: officer يقرأ سجله الخاص

-- 1) employers: admin يرى الكل، employee/supervisor يرى فرعه فقط
drop policy if exists "employees_full_access_employers" on public.employers;

create policy "employers_employee_scoped" on public.employers
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin' or ce.branch_id = employers.branch_id
    )
  );

-- 2) employer_officers: employee يرى فرعه (عبر join employers)، + المسؤول يقرأ سجله هو
drop policy if exists "employees_full_access_employer_officers" on public.employer_officers;

create policy "employer_officers_employee_scoped" on public.employer_officers
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      join public.employers em on em.id = employer_officers.employer_id
      where ce.role = 'admin' or ce.branch_id = em.branch_id
    )
  );

create policy "officer_reads_own_row" on public.employer_officers
  for select using (auth_user_id = auth.uid());

-- 3) employments: نطاق عبر فرع المواطن (نفس منطق transactions_select_scoped)
drop policy if exists "employees_full_access_employments" on public.employments;

create policy "employments_employee_scoped" on public.employments
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      join public.citizens c on c.id = employments.citizen_id
      where ce.role = 'admin' or ce.branch_id = c.branch_id
    )
  );

-- 4) contribution_rates: بيانات إعداد عامة — كل موظف نشط يقرأها، admin فقط يعدّلها
drop policy if exists "employees_full_access_contribution_rates" on public.contribution_rates;

create policy "contribution_rates_read_all_employees" on public.contribution_rates
  for select using (
    exists (select 1 from current_employee() ce(employee_id, role, branch_id))
  );

create policy "contribution_rates_admin_write" on public.contribution_rates
  for insert with check (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin'
    )
  );

create policy "contribution_rates_admin_update" on public.contribution_rates
  for update using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin'
    )
  );

create policy "contribution_rates_admin_delete" on public.contribution_rates
  for delete using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin'
    )
  );

-- 5) contributions: نطاق عبر فرع المواطن، بنفس منطق employments
drop policy if exists "employees_full_access_contributions" on public.contributions;

create policy "contributions_employee_scoped" on public.contributions
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      join public.employments em on em.id = contributions.employment_id
      join public.citizens c on c.id = em.citizen_id
      where ce.role = 'admin' or ce.branch_id = c.branch_id
    )
  );
