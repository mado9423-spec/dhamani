import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = /^image\/(png|jpe?g|tiff|webp)$/;

interface DropZoneScannerProps {
  onSelect: (file: File) => void;
}

export function DropZoneScanner({ onSelect }: DropZoneScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.test(file.type)) {
        setError("صيغة الملف غير مدعومة، يرجى اختيار صورة (JPG/PNG/TIFF)");
        return;
      }
      setError(null);
      onSelect(file);
    },
    [onSelect]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? "border-[#123F63] bg-[#E8EEF4]" : "border-[#E2E7EB] bg-[#FAFBFC]"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">
        🖨️
      </div>
      <p className="text-sm font-bold text-[#17212B]">اسحب ملف المستند الممسوح ضوئياً هنا</p>
      <p className="text-[13px] font-medium text-[#687581]">أو اضغط هنا لاختيار ملف من جهازك</p>

      {error && <p className="text-[13px] font-semibold text-[#C0392B]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
