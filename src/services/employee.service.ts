import { supabase } from "../lib/supabaseClient";
import { TransactionStatus } from "../components/StatusBadge";
import { logAuditEvent } from "./audit.service";

export interface EmployeeProfile {
  id: string;
  fullName: string;
  employeeNumber: string;
  branchId: string;
  role: "employee" | "supervisor" | "admin";
}

export interface CitizenSearchResult {
  id: string;
  fullName: string;
  pensionNumber: string;
  status: string;
  branchId: string;
}

export interface TransactionType {
  id: string;
  code: string;
  nameAr: string;
}

export async function getCurrentEmployee(): Promise<EmployeeProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, employee_number, branch_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    employeeNumber: data.employee_number,
    branchId: data.branch_id,
    role: data.role,
  };
}

export async function searchCitizenByPensionNumber(
  pensionNumber: string
): Promise<CitizenSearchResult | null> {
  const { data, error } = await supabase
    .from("citizens")
    .select("id, full_name, pension_number, status, branch_id")
    .eq("pension_number", pensionNumber.trim())
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    pensionNumber: data.pension_number,
    status: data.status,
    branchId: data.branch_id,
  };
}

export async function listTransactionTypes(): Promise<TransactionType[]> {
  const { data, error } = await supabase
    .from("transaction_types")
    .select("id, code, name_ar")
    .eq("is_active", true);

  if (error || !data) return [];

  return data.map((row) => ({ id: row.id, code: row.code, nameAr: row.name_ar }));
}

export async function createTransactionForCitizen(
  citizenId: string,
  branchId: string,
  transactionTypeId: string,
  notes: string,
  employeeId: string
): Promise<{ success: boolean; message?: string }> {
  const transactionNumber = `TXN-${Date.now().toString().slice(-8)}`;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      transaction_number: transactionNumber,
      citizen_id: citizenId,
      transaction_type_id: transactionTypeId,
      branch_id: branchId,
      assigned_employee_id: employeeId,
      status: "pending_review",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, message: "تعذر إنشاء المعاملة، تحقق من صلاحياتك" };
  }

  await logAuditEvent({
    actorId: employeeId,
    actorType: "employee",
    action: "created",
    tableName: "transactions",
    recordId: data.id,
    newData: { status: "pending_review", transaction_type_id: transactionTypeId },
  });

  return { success: true };
}

/**
 * المسار الوحيد المسموح به لتغيير transactions.status بعد الإنشاء —
 * يكتب دائماً سطراً في audit_logs. لا تُحدَّث الحالة مباشرة من أي مكان آخر.
 */
export async function transitionTransactionStatus(
  transactionId: string,
  previousStatus: TransactionStatus,
  newStatus: TransactionStatus,
  employeeId: string
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (error) {
    return { success: false, message: "تعذر تحديث حالة المعاملة" };
  }

  await logAuditEvent({
    actorId: employeeId,
    actorType: "employee",
    action: "transaction_status_changed",
    tableName: "transactions",
    recordId: transactionId,
    oldData: { status: previousStatus },
    newData: { status: newStatus },
  });

  return { success: true };
}
