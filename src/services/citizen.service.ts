import { supabase } from "../lib/supabaseClient";
import { CitizenProfile } from "../types/service";

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
