import { supabase } from "../lib/supabaseClient";

export interface EmployerOfficerProfile {
  id: string;
  fullName: string;
  officerNumber: string;
  role: "officer" | "admin";
  employerId: string;
}

export interface EmployerProfile {
  id: string;
  name: string;
  type: string;
  commercialRegisterNo: string | null;
  status: "pending" | "active" | "suspended";
  branchId: string;
}

export interface EmploymentRecord {
  id: string;
  citizenFullName: string;
  citizenPensionNumber: string;
  startDate: string;
  endDate: string | null;
  salaryBase: number;
  status: "active" | "ended";
}

interface EmployerLoginInput {
  officerNumber: string;
  password: string;
}

export async function employerLogin({
  officerNumber,
  password,
}: EmployerLoginInput): Promise<{ success: boolean; message?: string }> {
  const syntheticEmail = `${officerNumber.trim()}@employer.dhamani.ly`;

  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    return {
      success: false,
      message: "رقم المسؤول أو كلمة المرور غير صحيحة",
    };
  }

  return { success: true };
}

export async function signOutEmployer() {
  await supabase.auth.signOut();
}

export async function getCurrentEmployerOfficer(): Promise<EmployerOfficerProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("employer_officers")
    .select("id, full_name, officer_number, role, employer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    officerNumber: data.officer_number,
    role: data.role,
    employerId: data.employer_id,
  };
}

export async function getEmployer(employerId: string): Promise<EmployerProfile | null> {
  const { data, error } = await supabase
    .from("employers")
    .select("id, name, type, commercial_register_no, status, branch_id")
    .eq("id", employerId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    commercialRegisterNo: data.commercial_register_no,
    status: data.status,
    branchId: data.branch_id,
  };
}

export async function listEmployments(employerId: string): Promise<EmploymentRecord[]> {
  const { data, error } = await supabase
    .from("employments")
    .select(
      "id, start_date, end_date, salary_base, status, citizens(full_name, pension_number)"
    )
    .eq("employer_id", employerId)
    .order("start_date", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const citizen = Array.isArray(row.citizens) ? row.citizens[0] : row.citizens;
    return {
      id: row.id,
      citizenFullName: citizen?.full_name ?? "",
      citizenPensionNumber: citizen?.pension_number ?? "",
      startDate: row.start_date,
      endDate: row.end_date,
      salaryBase: row.salary_base,
      status: row.status,
    };
  });
}
