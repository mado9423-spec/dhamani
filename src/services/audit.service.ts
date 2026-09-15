import { supabase } from "../lib/supabaseClient";

export type AuditActorType = "citizen" | "employee" | "admin" | "system";

export interface LogAuditEventInput {
  actorId: string | null;
  actorType: AuditActorType;
  action: string;
  tableName: string;
  recordId: string | null;
  oldData?: unknown;
  newData?: unknown;
}

/**
 * يسجّل حدثاً في audit_logs. لا يُحذف أي سطر من هذا الجدول أبداً — هو
 * السجل الوحيد المرجعي لكل تغيير حالة. فشل التسجيل لا يوقف العملية
 * الأصلية (التي تكون قد نجحت فعلاً في جدولها) بل يُسجَّل في الكونسول فقط.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    actor_type: input.actorType,
    action: input.action,
    table_name: input.tableName,
    record_id: input.recordId,
    old_data: input.oldData ?? null,
    new_data: input.newData ?? null,
  });

  if (error) {
    console.error("تعذر تسجيل حدث في سجل التدقيق", error);
  }
}

export interface AuditLogEntry {
  id: number;
  action: string;
  tableName: string;
  recordId: string | null;
  actorType: AuditActorType;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
}

/**
 * يجلب سجلات التدقيق المرتبطة بمجموعة سجلات (مثلاً معاملات ومستندات
 * مواطن واحد). قراءة audit_logs محصورة بسياسة RLS على المشرف/الأدمن —
 * موظف عادي يحصل على قائمة فارغة، لا خطأ.
 */
export async function listAuditLogsForRecords(recordIds: string[]): Promise<AuditLogEntry[]> {
  if (recordIds.length === 0) return [];

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, actor_type, old_data, new_data, created_at")
    .in("record_id", recordIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    actorType: row.actor_type,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  }));
}
