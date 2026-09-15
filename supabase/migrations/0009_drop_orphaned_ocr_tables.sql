-- ============================================================
-- ضماني — الملف 9: حذف الجداول اليتيمة من منظومة أخرى غير مرتبطة
-- ============================================================
-- الجداول الأربعة التالية غير مُنشأة بأي migration سابق في هذا المستودع،
-- وغير مستخدَمة في أي كود React/خدمة بتطبيق "ضماني" (تم التحقق ببحث شامل
-- في src/ قبل هذا الملف). يبدو أنها بقايا منظومة OCR/إدخال رقمي أخرى كانت
-- تشارك نفس مشروع Supabase.
--
-- التحقق من الاعتماديات قبل الحذف (عبر information_schema وpg_depend):
--   - لا يوجد أي FK من جداول "ضماني" الحقيقية (citizens, transactions,
--     branches, employees, documents, ...) نحو أي من هذه الجداول الأربعة.
--   - الاعتماديات الوحيدة هي بينها هي بعضها البعض:
--       document_status_events → document_intakes → document_types
--       pension_beneficiaries (مستقلة، تشير فقط إلى citizens)
--   - لا توجد أي views تعتمد عليها.
-- لذلك الحذف آمن ولا يمس أي بيانات أو وظيفة في "ضماني".
--
-- ترتيب الحذف يراعي اعتماديات المفاتيح الخارجية بينها (الأبناء أولاً).

drop table if exists document_status_events;
drop table if exists document_intakes;
drop table if exists pension_beneficiaries;
drop table if exists document_types;
