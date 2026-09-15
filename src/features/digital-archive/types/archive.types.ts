export type IntakeSource = "camera" | "scanner" | "excel_upload";

export interface CapturedDocument {
  file: File;
  source: IntakeSource;
  capturedAt: string;
}

export type DocumentReviewStatus = "pending_review" | "reviewed" | "approved" | "rejected";

export const EXTRACTED_FIELD_LABELS = {
  documentType: "نوع الوثيقة",
  fullName: "الاسم",
  pensionNumber: "رقم المعاش",
  nationalId: "الرقم الوطني",
  documentDate: "التاريخ",
  branch: "الفرع",
  transactionType: "نوع المعاملة",
  financialAmount: "المبلغ",
} as const;

export type VerifiedFieldKey = keyof typeof EXTRACTED_FIELD_LABELS;
export type VerifiedFields = Record<VerifiedFieldKey, string>;
