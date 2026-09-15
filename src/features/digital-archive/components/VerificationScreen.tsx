import { useState } from "react";
import { TextField } from "../../../components/ui/TextField";
import { Button } from "../../../components/ui/Button";
import { ExtractedDocumentData } from "../services/ocrService";
import { isExcelFile } from "../services/excelService";
import { EXTRACTED_FIELD_LABELS, VerifiedFieldKey, VerifiedFields } from "../types/archive.types";

const FIELD_KEYS = Object.keys(EXTRACTED_FIELD_LABELS) as VerifiedFieldKey[];

const EMPTY_FIELDS: VerifiedFields = FIELD_KEYS.reduce((acc, key) => {
  acc[key] = "";
  return acc;
}, {} as VerifiedFields);

function fieldsFromExtractedData(data: ExtractedDocumentData | null): VerifiedFields {
  if (!data) return EMPTY_FIELDS;
  return {
    documentType: data.documentType,
    fullName: data.fullName,
    pensionNumber: data.pensionNumber,
    nationalId: data.nationalId,
    documentDate: data.documentDate,
    branch: data.branch,
    transactionType: data.transactionType,
    financialAmount: data.financialAmount !== null ? String(data.financialAmount) : "",
  };
}

interface VerificationScreenProps {
  file: File;
  previewUrl: string;
  initialData: ExtractedDocumentData | null;
  isSubmitting: boolean;
  onApprove: (fields: VerifiedFields) => void;
  onReject: () => void;
}

/**
 * شاشة المراجعة البشرية: تعرض المستند الأصلي بجانب الحقول المستخرجة القابلة
 * للتعديل. لا حفظ نهائي إلا بعد ضغط "اعتماد وتدقيق" هنا صراحة.
 */
export function VerificationScreen({
  file,
  previewUrl,
  initialData,
  isSubmitting,
  onApprove,
  onReject,
}: VerificationScreenProps) {
  const [fields, setFields] = useState<VerifiedFields>(() => fieldsFromExtractedData(initialData));

  function handleChange(key: VerifiedFieldKey, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-[#E2E7EB] bg-black">
        {isExcelFile(file) ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-white">
            <span className="text-3xl">📊</span>
            <span className="max-w-[80%] truncate text-[13px] font-semibold">{file.name}</span>
          </div>
        ) : (
          <img
            src={previewUrl}
            alt="المستند الأصلي"
            className="max-h-72 w-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {FIELD_KEYS.map((key) => (
          <TextField
            key={key}
            id={`verify-${key}`}
            label={EXTRACTED_FIELD_LABELS[key]}
            value={fields[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl border border-[#E2E7EB] text-sm font-bold text-[#17212B] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          رفض / إعادة مسح
        </button>
        <Button onClick={() => onApprove(fields)} isLoading={isSubmitting} className="flex-1">
          اعتماد وتدقيق
        </Button>
      </div>
    </div>
  );
}
