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
