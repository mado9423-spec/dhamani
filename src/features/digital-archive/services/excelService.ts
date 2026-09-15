import { ExtractedDocumentData } from "./ocrService";
import { EXTRACTED_FIELD_LABELS, VerifiedFieldKey } from "../types/archive.types";

const LABEL_TO_KEY: Record<string, VerifiedFieldKey> = Object.fromEntries(
  Object.entries(EXTRACTED_FIELD_LABELS).map(([key, label]) => [label, key as VerifiedFieldKey])
);

export const EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

export function isExcelFile(file: File): boolean {
  return (
    EXCEL_MIME_TYPES.includes(file.type) ||
    /\.(xlsx|xls)$/i.test(file.name)
  );
}

/**
 * يقرأ أول ورقة في ملف Excel بتنسيق عمودين: عمود A يحمل اسم الحقل
 * (نفس تسميات EXTRACTED_FIELD_LABELS)، وعمود B يحمل القيمة. أي صف لا
 * يطابق تسمية معروفة يُتجاهَل من الحقول لكن يبقى ضمن rawText الكامل.
 */
export async function extractDataFromExcel(file: File): Promise<ExtractedDocumentData> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  const fields: Partial<Record<VerifiedFieldKey, string>> = {};
  const rawLines: string[] = [];

  for (const row of rows) {
    const label = String(row[0] ?? "").trim();
    const value = row[1];
    rawLines.push(row.map((cell) => String(cell ?? "")).join(" | "));

    const key = LABEL_TO_KEY[label];
    if (key && value !== undefined && value !== null && String(value).trim() !== "") {
      fields[key] = String(value).trim();
    }
  }

  const financialAmountRaw = fields.financialAmount;

  const result: ExtractedDocumentData = {
    documentType: fields.documentType ?? "غير محدد",
    fullName: fields.fullName ?? "",
    pensionNumber: fields.pensionNumber ?? "",
    nationalId: fields.nationalId ?? "",
    documentDate: fields.documentDate ?? "",
    branch: fields.branch ?? "",
    transactionType: fields.transactionType ?? "غير محدد",
    financialAmount: financialAmountRaw
      ? Number(financialAmountRaw.replace(/,/g, ""))
      : null,
    confidenceScore: 0,
    rawText: rawLines.join("\n"),
  };

  const values = [
    result.documentType,
    result.fullName,
    result.pensionNumber,
    result.nationalId,
    result.documentDate,
    result.branch,
    result.transactionType,
    result.financialAmount,
  ];
  const filled = values.filter((v) => v !== null && v !== "" && v !== "غير محدد").length;
  result.confidenceScore = Number((filled / values.length).toFixed(3));

  return result;
}
