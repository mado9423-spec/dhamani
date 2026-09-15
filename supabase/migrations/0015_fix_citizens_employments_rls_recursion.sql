-- الحلقة الثالثة والأخيرة: citizens.employer_officer_reads_employed_citizens (0013)
-- يعمل join مباشر مع employments+employer_officers، بينما
-- employments.citizen_reads_own_employments (0010) يستعلم مباشرة من citizens.
-- نفس الحل: دالة security definer تكسر الحلقة من جهة citizens.

create or replace function is_citizen_employed_by_caller_officer(p_citizen_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from employments em
    join employer_officers o on o.employer_id = em.employer_id
    where em.citizen_id = p_citizen_id
      and o.auth_user_id = auth.uid()
  );
$$;

drop policy if exists "employer_officer_reads_employed_citizens" on public.citizens;

create policy "employer_officer_reads_employed_citizens" on public.citizens
  for select using (is_citizen_employed_by_caller_officer(citizens.id));
