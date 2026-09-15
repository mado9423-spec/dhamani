-- إضافة معرّف تسجيل دخول لمسؤول جهة العمل، بنفس نمط employees.employee_number
-- (employer_officers لم يكن يحتوي أي عمود فريد يصلح لبناء بريد اصطناعي)

alter table public.employer_officers
  add column officer_number text unique not null;
