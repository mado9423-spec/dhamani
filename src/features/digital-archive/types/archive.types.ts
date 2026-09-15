export type IntakeSource = "camera" | "scanner" | "pdf_upload";

export interface CapturedDocument {
  file: File;
  source: IntakeSource;
  capturedAt: string;
}
