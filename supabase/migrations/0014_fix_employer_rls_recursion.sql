-- إصلاح تكرار لا نهائي (infinite recursion) في سياسات RLS بين
-- employer_officers <-> employers، وبنفس الخلل بنيوياً بين employments <-> citizens.
-- الحل: دوال security definer تقرأ العمود المطلوب مباشرة متجاوزةً RLS،
-- بنفس أسلوب current_employee()/current_citizen_id() الموجود مسبقاً.

create or replace function employer_branch_id(p_employer_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select branch_id from employers where id = p_employer_id;
$$;

create or replace function citizen_branch_id(p_citizen_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select branch_id from citizens where id = p_citizen_id;
$$;

-- employer_officers: إزالة الـ join المباشر مع employers (مصدر الحلقة)
drop policy if exists "employer_officers_employee_scoped" on public.employer_officers;

create policy "employer_officers_employee_scoped" on public.employer_officers
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin' or ce.branch_id = employer_branch_id(employer_officers.employer_id)
    )
  );

-- employments: إزالة الـ join المباشر مع citizens (نفس الفخ البنيوي)
drop policy if exists "employments_employee_scoped" on public.employments;

create policy "employments_employee_scoped" on public.employments
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      where ce.role = 'admin' or ce.branch_id = citizen_branch_id(employments.citizen_id)
    )
  );

-- contributions: نفس الإصلاح (كانت تعمل join مع employments ثم citizens)
drop policy if exists "contributions_employee_scoped" on public.contributions;

create policy "contributions_employee_scoped" on public.contributions
  for all using (
    exists (
      select 1 from current_employee() ce(employee_id, role, branch_id)
      join public.employments em on em.id = contributions.employment_id
      where ce.role = 'admin' or ce.branch_id = citizen_branch_id(em.citizen_id)
    )
  );
