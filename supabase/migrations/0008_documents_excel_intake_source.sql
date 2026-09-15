-- ============================================================
-- ضماني — الملف 8: استبدال رفع PDF برفع Excel في مصدر الإدخال
-- ============================================================
-- لا نعدّل migration 0004 القديمة (مُطبَّقة بالفعل)، بل نُصلح القيد
-- المسموح به لعمود intake_source بنفس منطق migration 0007.

alter table documents
  drop constraint documents_intake_source_check;

alter table documents
  add constraint documents_intake_source_check
  check (intake_source in ('camera', 'scanner', 'excel_upload'));
