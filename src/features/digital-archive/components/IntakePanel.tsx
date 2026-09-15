import { useState } from "react";
import { CameraCapture } from "./CameraCapture";
import { DropZoneScanner } from "./DropZoneScanner";
import { ExcelUploader } from "./ExcelUploader";
import { IntakeSource } from "../types/archive.types";

type IntakeMode = "scanner" | "camera" | "excel";

interface IntakePanelProps {
  onDocumentReady: (file: File, source: IntakeSource) => void;
}

const MODES: { key: IntakeMode; label: string; source: IntakeSource }[] = [
  { key: "scanner", label: "🖨️ سحب وإفلات", source: "scanner" },
  { key: "camera", label: "📷 كاميرا", source: "camera" },
  { key: "excel", label: "📊 رفع Excel", source: "excel_upload" },
];

export function IntakePanel({ onDocumentReady }: IntakePanelProps) {
  const [mode, setMode] = useState<IntakeMode>("scanner");

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl bg-[#F5F6F7] p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`h-10 flex-1 rounded-lg text-[13px] font-bold transition-colors ${
              mode === m.key
                ? "bg-white text-[#123F63] shadow-sm"
                : "text-[#687581]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "scanner" && (
        <DropZoneScanner onSelect={(file) => onDocumentReady(file, "scanner")} />
      )}
      {mode === "camera" && (
        <CameraCapture onCapture={(file) => onDocumentReady(file, "camera")} />
      )}
      {mode === "excel" && (
        <ExcelUploader onSelect={(file) => onDocumentReady(file, "excel_upload")} />
      )}
    </div>
  );
}
