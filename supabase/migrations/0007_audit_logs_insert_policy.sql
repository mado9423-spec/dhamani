-- ============================================================
-- ضماني — الملف 7: صلاحية إدراج سجلات التدقيق
-- ============================================================
-- migration 0002 فعّلت RLS على audit_logs وأضافت سياسة SELECT للمشرفين
-- فقط، لكن لم تُضف سياسة INSERT قط — أي كتابة من الواجهة كانت سترفضها
-- RLS ضمنياً. هذه السياسة تسمح لأي موظف بإدراج سجل تدقيق لنفسه فقط
-- (actor_id يطابق هويته)، وهو ما يلزم لربط WorkflowTracker وشاشة
-- الاعتماد بجدول audit_logs الموجود مسبقاً.

create policy "audit_logs_employee_insert_own"
  on audit_logs for insert
  to authenticated
  with check (
    actor_type = 'employee'
    and actor_id in (select employee_id from current_employee())
  );
