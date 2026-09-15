import { useRef, useState } from "react";
import { isExcelFile } from "../services/excelService";

interface ExcelUploaderProps {
  onSelect: (file: File) => void;
}

export function ExcelUploader({ onSelect }: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!isExcelFile(file)) {
      setError("يرجى اختيار ملف بصيغة Excel فقط (xlsx أو xls)");
      return;
    }
    setError(null);
    setFileName(file.name);
    onSelect(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#E2E7EB] bg-[#FAFBFC] p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">
        📊
      </div>
      <p className="text-sm font-bold text-[#17212B]">اضغط لرفع ملف Excel</p>
      <p className="text-[13px] font-medium text-[#687581]">
        عمود A: اسم الحقل، عمود B: القيمة — xlsx أو xls
      </p>

      {fileName && <p className="text-[13px] font-semibold text-[#123F63]">{fileName}</p>}
      {error && <p className="text-[13px] font-semibold text-[#C0392B]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
