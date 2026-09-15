import { supabase } from "../../../lib/supabaseClient";
import { IntakeSource } from "../types/archive.types";
import { ExtractedDocumentData } from "./ocrService";

export interface CreateDocumentInput {
  citizenId: string;
  branchId: string;
  intakeSource: IntakeSource;
  documentType: string;
  storagePath: string;
  storageBucket: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  ocrRawText: string | null;
  ocrConfidence: number | null;
  extractedData: ExtractedDocumentData | null;
  uploadedBy: string;
}

export interface CreateDocumentResult {
  success: boolean;
  documentId?: string;
  message?: string;
}

/**
 * يُدرج سطر المستند بحالة review_status الافتراضية 'pending_review' دائماً —
 * لا يوجد مسار آخر يكتب في هذا الجدول بحالة نهائية (الاعتماد يتم لاحقاً
 * عبر شاشة المراجعة في مرحلة قادمة).
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<CreateDocumentResult> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      citizen_id: input.citizenId,
      branch_id: input.branchId,
      intake_source: input.intakeSource,
      document_type: input.documentType || null,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      original_filename: input.originalFilename,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      ocr_raw_text: input.ocrRawText,
      ocr_confidence: input.ocrConfidence,
      extracted_data: input.extractedData,
      uploaded_by: input.uploadedBy,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, message: "تعذر حفظ المستند، تحقق من صلاحياتك" };
  }

  return { success: true, documentId: data.id };
}

export interface CitizenDocumentSummary {
  id: string;
  documentType: string | null;
  reviewStatus: string;
  storagePath: string;
  originalFilename: string | null;
  createdAt: string;
}

export async function listCitizenDocuments(
  citizenId: string
): Promise<CitizenDocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, document_type, review_status, storage_path, original_filename, created_at")
    .eq("citizen_id", citizenId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    documentType: row.document_type,
    reviewStatus: row.review_status,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    createdAt: row.created_at,
  }));
}
