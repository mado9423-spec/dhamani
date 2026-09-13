import { supabase } from "../lib/supabaseClient";
import { TransactionStatus } from "../components/StatusBadge";

export interface TransactionRecord {
  id: string;
  transactionNumber: string;
  typeName: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  isMilitary: boolean;
}

export async function listMyTransactions(): Promise<TransactionRecord[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      transaction_number,
      status,
      created_at,
      updated_at,
      transaction_types ( name_ar ),
      military_transactions ( id )
    `
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    transactionNumber: row.transaction_number,
    typeName: row.transaction_types?.name_ar ?? "معاملة",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isMilitary: Array.isArray(row.military_transactions)
      ? row.military_transactions.length > 0
      : Boolean(row.military_transactions),
  }));
}

export function formatArabicDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ar-LY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
