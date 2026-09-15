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
