import { supabase } from "../lib/supabaseClient";

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export async function listMyNotifications(): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}
