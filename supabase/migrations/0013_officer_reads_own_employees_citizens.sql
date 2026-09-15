-- يسمح لمسؤول جهة العمل بقراءة بيانات المواطنين المرتبطين بسجلات توظيف
-- لدى جهته فقط (لازم لـ join citizens داخل listEmployments في employer.service.ts)

create policy "employer_officer_reads_employed_citizens" on public.citizens
  for select using (
    exists (
      select 1 from public.employments em
      join public.employer_officers o on o.employer_id = em.employer_id
      where em.citizen_id = citizens.id
        and o.auth_user_id = auth.uid()
    )
  );
