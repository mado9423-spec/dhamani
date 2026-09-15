-- ============================================================
-- ضماني — الملف 6: تخزين ملفات الأرشيف الرقمي (Supabase Storage)
-- ============================================================
-- Bucket خاص (غير عام) لملفات المواطنين الممسوحة/المصوَّرة.
-- مسار كل ملف: {branch_id}/{citizen_id}/{timestamp}-{uuid}.{ext}
-- بحيث يمكن لسياسات RLS التحقق من الفرع مباشرة من اسم المسار
-- دون الحاجة لجدول documents (الملف قد يُرفع قبل إدراج سطره).

insert into storage.buckets (id, name, public)
values ('citizen-documents', 'citizen-documents', false)
on conflict (id) do nothing;

create policy "citizen_documents_select_scoped"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'citizen-documents'
    and (
      exists (
        select 1 from current_employee() ce
        where ce.role = 'admin'
           or ce.branch_id::text = (storage.foldername(name))[1]
      )
      or exists (
        select 1 from citizens c
        where c.auth_user_id = auth.uid()
          and c.id::text = (storage.foldername(name))[2]
      )
    )
  );

create policy "citizen_documents_employee_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'citizen-documents'
    and exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id::text = (storage.foldername(name))[1]
    )
  );

create policy "citizen_documents_employee_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'citizen-documents'
    and exists (
      select 1 from current_employee() ce
      where ce.role = 'admin'
         or ce.branch_id::text = (storage.foldername(name))[1]
    )
  );
