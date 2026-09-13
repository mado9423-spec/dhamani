-- ============================================================
-- ضماني — الملف 1: الجداول الأساسية
-- ============================================================

create extension if not exists pgcrypto;

create table branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table branches is 'فروع صندوق الضمان الاجتماعي. إضافة فرع جديد لاحقاً = صف جديد فقط.';

create table citizens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  pension_number text unique not null,
  national_id text unique,
  branch_id uuid not null references branches(id),
  phone text,
  date_of_birth date,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_citizens_branch on citizens(branch_id);
create index idx_citizens_pension_number on citizens(pension_number);
create index idx_citizens_auth_user on citizens(auth_user_id);

create table employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_number text unique not null,
  full_name text not null,
  branch_id uuid not null references branches(id),
  role text not null default 'employee'
    check (role in ('employee', 'supervisor', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_employees_branch on employees(branch_id);
create index idx_employees_auth_user on employees(auth_user_id);

create table transaction_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  description text,
  is_active boolean not null default true
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text unique not null,
  citizen_id uuid not null references citizens(id),
  transaction_type_id uuid not null references transaction_types(id),
  branch_id uuid not null references branches(id),
  assigned_employee_id uuid references employees(id),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'accepted', 'rejected', 'completed', 'suspended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_citizen on transactions(citizen_id);
create index idx_transactions_branch on transactions(branch_id);
create index idx_transactions_status on transactions(status);
create index idx_transactions_employee on transactions(assigned_employee_id);

create table military_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid unique not null references transactions(id) on delete cascade,
  military_id_number text,
  rank text,
  unit text,
  additional_data jsonb,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references citizens(id),
  branch_id uuid not null references branches(id),
  appointment_type text not null
    check (appointment_type in (
      'annual_declaration', 'advance_disbursement',
      'new_pension_disbursement', 'general'
    )),
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now()
);

create index idx_appointments_citizen on appointments(citizen_id);
create index idx_appointments_branch_date on appointments(branch_id, appointment_date);

create table annual_declarations (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references citizens(id),
  branch_id uuid not null references branches(id),
  declaration_year int not null,
  appointment_id uuid references appointments(id),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'failed')),
  verification_method text not null default 'live_image',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (citizen_id, declaration_year)
);

create index idx_declarations_citizen on annual_declarations(citizen_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references citizens(id),
  employee_id uuid references employees(id),
  title text not null,
  body text not null,
  type text not null default 'general',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_check
    check (citizen_id is not null or employee_id is not null)
);

create index idx_notifications_citizen on notifications(citizen_id);
create index idx_notifications_employee on notifications(employee_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null check (actor_type in ('citizen', 'employee', 'admin', 'system')),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_table on audit_logs(table_name, record_id);
