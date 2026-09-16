import { supabase } from "../lib/supabaseClient";
import { CitizenProfile } from "../types/service";

export interface CitizenFullProfile {
  id: string;
  fullName: string;
  pensionNumber: string;
  nationalId: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  status: "active" | "suspended" | "archived";
  branchName: string;
}

export async function getCitizenFullProfile(): Promise<CitizenFullProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("citizens")
    .select(
      "id, full_name, pension_number, national_id, phone, date_of_birth, status, branches(name)"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const branch = Array.isArray(data.branches) ? data.branches[0] : data.branches;

  return {
    id: data.id,
    fullName: data.full_name,
    pensionNumber: data.pension_number,
    nationalId: data.national_id,
    phone: data.phone,
    dateOfBirth: data.date_of_birth,
    status: data.status,
    branchName: branch?.name ?? "",
  };
}

export async function getCurrentCitizen(): Promise<CitizenProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("citizens")
    .select("id, full_name, pension_number, branch_id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    pensionNumber: data.pension_number,
    branchId: data.branch_id,
    status: data.status,
  };
}
