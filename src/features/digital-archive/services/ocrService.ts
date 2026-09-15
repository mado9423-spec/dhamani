export interface ExtractedDocumentData {
  documentType: string;
  fullName: string;
  pensionNumber: string;
  nationalId: string;
  documentDate: string;
  branch: string;
  transactionType: string;
  financialAmount: number | null;
  confidenceScore: number;
  rawText: string;
}

interface OcrProvider {
  extractText(file: File): Promise<string>;
}

// -- Tesseract.js implementation: كل المعالجة تتم محلياً داخل المتصفح --
class TesseractOcrProvider implements OcrProvider {
  async extractText(file: File): Promise<string> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ara+eng");
    const imageUrl = URL.createObjectURL(file);
    try {
      const { data } = await worker.recognize(imageUrl);
      return data.text;
    } finally {
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);
    }
  }
}

// -- Cloud Vision عبر Backend proxy، لا يوجد API key في الـ frontend أبداً.
// يتطلب Edge Function غير موجودة بعد (POST /api/ocr/cloud-vision) — تبقى معطّلة
// حتى تُبنى في مرحلة لاحقة، والتبديل إليها يتم فقط عبر متغير البيئة.
class CloudVisionOcrProvider implements OcrProvider {
  async extractText(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("document", file);
    const res = await fetch("/api/ocr/cloud-vision", { method: "POST", body: formData });
    if (!res.ok) throw new Error("فشل استدعاء خدمة OCR السحابية");
    const { text } = (await res.json()) as { text: string };
    return text;
  }
}

function getProvider(): OcrProvider {
  return import.meta.env.VITE_OCR_PROVIDER === "cloud_vision"
    ? new CloudVisionOcrProvider()
    : new TesseractOcrProvider();
}

const BRANCH_NAMES = [
  "بنغازي",
  "طرابلس",
  "البيضاء",
  "مصراتة",
  "سبها",
  "درنة",
  "طبرق",
  "الزاوية",
];

// أنواع المعاملات كما هي مزروعة فعلياً في transaction_types
const TRANSACTION_TYPE_PATTERNS: Record<string, RegExp> = {
  "معاش جديد": /معاش\s*جديد/,
  تعديل: /تعديل/,
  إفراج: /إفراج/,
  "منحة وفاة": /منحة\s*وفاة/,
  سلفة: /سلفة/,
  إلغاء: /إلغاء/,
  إيقاف: /إيقاف/,
};

const DOCUMENT_TYPE_PATTERNS: Record<string, RegExp> = {
  "طلب صرف": /طلب\s*صرف/,
  تظلم: /تظلم/,
  "استمارة اشتراك": /استمارة\s*اشتراك/,
  "إقرار سنوي": /إقرار\s*سنوي/,
};

function detectFromPatterns(text: string, patterns: Record<string, RegExp>): string {
  const match = Object.entries(patterns).find(([, pattern]) => pattern.test(text));
  return match?.[0] ?? "غير محدد";
}

function extractBranch(text: string): string {
  const found = BRANCH_NAMES.find((name) => text.includes(name));
  if (found) return found;
  const m = text.match(/فرع[:\s]*([؀-ۿ\s]+)/);
  return m?.[1]?.trim() ?? "";
}

interface ParsedFields {
  documentType: string;
  fullName: string;
  pensionNumber: string;
  nationalId: string;
  documentDate: string;
  branch: string;
  transactionType: string;
  financialAmount: number | null;
}

/**
 * يحلل النص الخام ويستخرج الحقول المطلوبة باستخدام Regex + قواعد مطابقة
 * (يمكن استبداله لاحقاً بنموذج NLP/LLM للاستخراج البنيوي الأدق)
 */
function parseFields(rawText: string): ParsedFields {
  const pensionMatch = rawText.match(/رقم\s*المعاش[:\s]*([\d/-]+)/);
  const nationalIdMatch = rawText.match(/(?:الرقم\s*الوطني|رقم\s*الهوية)[:\s]*(\d{9,12})/);
  const dateMatch = rawText.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  const amountMatch = rawText.match(/(?:المبلغ|القيمة)[:\s]*([\d,.]+)/);
  const nameMatch = rawText.match(/الاسم(?:\s*الرباعي)?[:\s]*([؀-ۿ\s]+)/);

  return {
    documentType: detectFromPatterns(rawText, DOCUMENT_TYPE_PATTERNS),
    fullName: nameMatch?.[1]?.trim() ?? "",
    pensionNumber: pensionMatch?.[1] ?? "",
    nationalId: nationalIdMatch?.[1] ?? "",
    documentDate: dateMatch?.[1] ?? "",
    branch: extractBranch(rawText),
    transactionType: detectFromPatterns(rawText, TRANSACTION_TYPE_PATTERNS),
    financialAmount: amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : null,
  };
}

const UNFILLED_VALUES = new Set(["", "غير محدد"]);

function scoreConfidence(fields: ParsedFields): number {
  const values = Object.values(fields);
  const filled = values.filter((v) => v !== null && !UNFILLED_VALUES.has(String(v)));
  return Number((filled.length / values.length).toFixed(3));
}

/**
 * الدالة الرئيسية التي تستدعيها الواجهة: تشغّل مزوّد الـ OCR الحالي ثم تحلل النص الناتج.
 */
export async function extractDocumentData(file: File): Promise<ExtractedDocumentData> {
  const provider = getProvider();
  const rawText = await provider.extractText(file);
  const fields = parseFields(rawText);

  return { ...fields, confidenceScore: scoreConfidence(fields), rawText };
}
