-- حذف بقايا منظومة "digital_intake_ocr_system" اليتيمة
-- تم التحقق: صفر استخدام في كود التطبيق، صفر مراجع FK من أي جدول فعلي،
-- صفر Views تعتمد عليها. استُبدلت بنظام "documents" الفعلي (0004_digital_archive_schema).

drop table if exists public.document_status_events cascade;
drop table if exists public.document_intakes cascade;
drop table if exists public.document_types cascade;
drop table if exists public.pension_beneficiaries cascade;
