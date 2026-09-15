import { supabase } from "../../../lib/supabaseClient";

export const DOCUMENTS_BUCKET = "citizen-documents";

export interface UploadedDocumentFile {
  storagePath: string;
  storageBucket: string;
}

/**
 * يرفع الملف إلى مسار {branchId}/{citizenId}/... ويعيد المسار المخزن
 * (للربط بجدول documents). سياسات RLS على الـ bucket تتحقق من الفرع
 * مباشرة من هذا المسار — راجع migration 0006.
 */
export async function uploadDocumentFile(
  file: File,
  branchId: string,
  citizenId: string
): Promise<UploadedDocumentFile> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${branchId}/${citizenId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  return { storagePath: path, storageBucket: DOCUMENTS_BUCKET };
}

/**
 * يولّد رابط موقّت آمن لعرض الملف (الـ bucket غير عام).
 */
export async function getDocumentSignedUrl(
  path: string,
  expiresInSeconds = 600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
