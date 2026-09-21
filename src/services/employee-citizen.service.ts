import { supabase } from "../lib/supabaseClient";

export async function getCitizenById(citizenId: string) {
  const { data, error } = await supabase
    .from("citizens")
    .select("id, full_name, pension_number, status, branch_id, phone")
    .eq("id", citizenId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getCitizenDeclarations(citizenId: string) {
  const { data } = await supabase
    .from("annual_declarations")
    .select("id, declaration_year, status, verification_status, submitted_at")
    .eq("citizen_id", citizenId)
    .order("declaration_year", { ascending: false });

  return data ?? [];
}

export async function getCitizenAppointments(citizenId: string) {
  const { data } = await supabase
    .from("appointments")
    .select("id, appointment_type, appointment_date, appointment_time, status")
    .eq("citizen_id", citizenId)
    .order("appointment_date", { ascending: false });

  return data ?? [];
}

export async function getCitizenTransactions(citizenId: string) {
  const { data } = await supabase
    .from("transactions")
    .select("id, transaction_number, status, created_at, transaction_types(name_ar)")
    .eq("citizen_id", citizenId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export interface ActivationCodeResult {
  success: boolean;
  code?: string;
  expiresAt?: string;
  message?: string;
}

// Employee issues a one-time activation code for a citizen of his own branch.
// Authorization and audit are enforced inside the database function.
export async function issueActivationCode(
  citizenId: string
): Promise<ActivationCodeResult> {
  const { data, error } = await supabase.rpc("issue_citizen_activation_code", {
    p_citizen_id: citizenId,
  });

  if (error) {
    if (error.code === "42501") {
      return { success: false, message: "لا تملك صلاحية إصدار رمز لهذا المواطن" };
    }
    if (error.message.includes("citizen_not_active")) {
      return { success: false, message: "حساب المواطن غير نشط" };
    }
    return { success: false, message: "تعذر إصدار رمز التفعيل، حاول مرة أخرى" };
  }

  const result = data as { code?: string; expires_at?: string } | null;
  if (!result?.code) {
    return { success: false, message: "تعذر إصدار رمز التفعيل، حاول مرة أخرى" };
  }

  return { success: true, code: result.code, expiresAt: result.expires_at };
}
