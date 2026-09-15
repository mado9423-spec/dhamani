-- نظام جهات العمل (Employers) — الجزء المفقود بالكامل من "ضماني"
-- يتبع نفس نمط citizens/employees القائم (auth_user_id -> auth.users, RLS مفعّل)

create table public.employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'وطنية'
    check (type in ('وطنية', 'أجنبية', 'وحدة إدارية', 'تشاركية', 'فردي')),
  commercial_register_no text,
  bank_name text,
  bank_account text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  branch_id uuid not null references public.branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employer_officers (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id),
  full_name text not null,
  role text not null default 'officer'
    check (role in ('officer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.employments (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.citizens(id),
  employer_id uuid not null references public.employers(id),
  start_date date not null,
  end_date date,
  salary_base numeric(12,2) not null,
  status text not null default 'active'
    check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);
create index idx_employments_citizen on public.employments(citizen_id);
create index idx_employments_employer on public.employments(employer_id);

create table public.contribution_rates (
  id uuid primary key default gen_random_uuid(),
  effective_from date not null,
  effective_to date,
  sector text not null default 'civil'
    check (sector in ('civil', 'military', 'self_employed')),
  total_rate_pct numeric(5,2) not null,
  employer_share_pct numeric(5,2) not null,
  employee_share_pct numeric(5,2) not null,
  treasury_share_pct numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments(id),
  period_month date not null,
  salary_amount numeric(12,2) not null,
  employer_amount numeric(12,2) not null,
  employee_amount numeric(12,2) not null,
  treasury_amount numeric(12,2) not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employment_id, period_month)
);
create index idx_contributions_employment on public.contributions(employment_id);

-- تفعيل RLS على الجداول الجديدة
alter table public.employers enable row level security;
alter table public.employer_officers enable row level security;
alter table public.employments enable row level security;
alter table public.contribution_rates enable row level security;
alter table public.contributions enable row level security;

-- موظفو الصندوق (employees) يشوفون كل شيء — نفس نمط الجداول الحالية
create policy "employees_full_access_employers" on public.employers
  for all using (
    exists (select 1 from public.employees e where e.auth_user_id = auth.uid())
  );

create policy "employees_full_access_employer_officers" on public.employer_officers
  for all using (
    exists (select 1 from public.employees e where e.auth_user_id = auth.uid())
  );

create policy "employees_full_access_employments" on public.employments
  for all using (
    exists (select 1 from public.employees e where e.auth_user_id = auth.uid())
  );

create policy "employees_full_access_contribution_rates" on public.contribution_rates
  for all using (
    exists (select 1 from public.employees e where e.auth_user_id = auth.uid())
  );

create policy "employees_full_access_contributions" on public.contributions
  for all using (
    exists (select 1 from public.employees e where e.auth_user_id = auth.uid())
  );

-- مسؤول الشؤون الضمانية بالشركة يشوف فقط بيانات جهته
create policy "officer_reads_own_employer" on public.employers
  for select using (
    exists (
      select 1 from public.employer_officers o
      where o.employer_id = employers.id and o.auth_user_id = auth.uid()
    )
  );

create policy "officer_reads_own_employments" on public.employments
  for select using (
    exists (
      select 1 from public.employer_officers o
      where o.employer_id = employments.employer_id and o.auth_user_id = auth.uid()
    )
  );

create policy "officer_reads_own_contributions" on public.contributions
  for select using (
    exists (
      select 1 from public.employer_officers o
      join public.employments em on em.employer_id = o.employer_id
      where em.id = contributions.employment_id and o.auth_user_id = auth.uid()
    )
  );

-- المواطن يشوف فقط سجل توظيفه الخاص (قراءة فقط)
create policy "citizen_reads_own_employments" on public.employments
  for select using (
    exists (
      select 1 from public.citizens c
      where c.id = employments.citizen_id and c.auth_user_id = auth.uid()
    )
  );
