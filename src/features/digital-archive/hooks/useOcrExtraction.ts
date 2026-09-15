import { useCallback, useState } from "react";
import { extractDocumentData, ExtractedDocumentData } from "../services/ocrService";
import { extractDataFromExcel, isExcelFile } from "../services/excelService";

type ExtractionStatus = "idle" | "processing" | "done" | "error" | "unsupported";

interface UseOcrExtractionResult {
  status: ExtractionStatus;
  data: ExtractedDocumentData | null;
  errorMessage: string | null;
  runExtraction: (file: File) => Promise<void>;
  reset: () => void;
}

export function useOcrExtraction(): UseOcrExtractionResult {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [data, setData] = useState<ExtractedDocumentData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runExtraction = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isExcel = isExcelFile(file);

    if (!isImage && !isExcel) {
      setStatus("unsupported");
      setData(null);
      return;
    }

    setStatus("processing");
    setErrorMessage(null);

    try {
      const result = isExcel ? await extractDataFromExcel(file) : await extractDocumentData(file);
      setData(result);
      setStatus("done");
    } catch (err) {
      setErrorMessage("تعذر استخراج بيانات المستند، يمكنك إدخال الحقول يدوياً");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setErrorMessage(null);
  }, []);

  return { status, data, errorMessage, runExtraction, reset };
}
