-- ============================================================
-- ضماني — الملف 4: منظومة الإدخال الرقمي والأرشفة الذكية (المرحلة 4: البنية)
-- ============================================================
-- جدول واحد للوثائق الممسوحة/المصوَّرة ونتائج الـ OCR الخاصة بها.
-- الحفظ النهائي (اعتماد المستند) لا يتم إلا عبر مسار موظف صريح لاحقاً،
-- لذلك review_status الافتراضية دائماً 'pending_review'.

create table documents (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references citizens(id),
  branch_id uuid not null references branches(id),
  transaction_id uuid references transactions(id),

  document_type text,
  intake_source text not null default 'scanner'
    check (intake_source in ('camera', 'scanner', 'pdf_upload')),

  storage_bucket text not null default 'citizen-documents',
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,

  ocr_raw_text text,
  ocr_confidence numeric(4,3),
  extracted_data jsonb,
  verified_data jsonb,

  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'reviewed', 'approved', 'rejected')),

  uploaded_by uuid references employees(id),
  reviewed_by uuid references employees(id),
  approved_by uuid references employees(id),
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table documents is 'الوثائق الممسوحة ضوئياً/المصوَّرة مع نتائج OCR الخام والمُراجَعة. review_status يبقى pending_review حتى يعتمدها موظف صراحة.';
comment on column documents.extracted_data is 'نسخة كاملة من مخرجات OCR الخام كما استُخرجت آلياً (قبل أي تعديل بشري).';
comment on column documents.verified_data is 'البيانات بعد مراجعة وتعديل الموظف — تُقارَن مع extracted_data لتغذية audit_logs.';

create index idx_documents_citizen on documents(citizen_id);
create index idx_documents_branch on documents(branch_id);
create index idx_documents_transaction on documents(transaction_id);
create index idx_documents_review_status on documents(review_status);
