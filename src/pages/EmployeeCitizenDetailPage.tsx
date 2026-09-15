import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { StatusBadge, TransactionStatus } from "../components/StatusBadge";
import {
  getCitizenById,
  getCitizenDeclarations,
  getCitizenAppointments,
  getCitizenTransactions,
} from "../services/employee-citizen.service";
import {
  getCurrentEmployee,
  listTransactionTypes,
  createTransactionForCitizen,
  EmployeeProfile,
  TransactionType,
} from "../services/employee.service";
import { IntakePanel } from "../features/digital-archive/components/IntakePanel";
import { IntakeSource } from "../features/digital-archive/types/archive.types";
import { useOcrExtraction } from "../features/digital-archive/hooks/useOcrExtraction";
import { uploadDocumentFile } from "../features/digital-archive/services/storageService";
import { createDocument } from "../features/digital-archive/services/document.service";

interface CapturedDocument {
  file: File;
  source: IntakeSource;
  previewUrl: string;
}

const EXTRACTED_FIELD_LABELS: Record<string, string> = {
  documentType: "نوع الوثيقة",
  fullName: "الاسم",
  pensionNumber: "رقم المعاش",
  nationalId: "الرقم الوطني",
  documentDate: "التاريخ",
  branch: "الفرع",
  transactionType: "نوع المعاملة",
  financialAmount: "المبلغ",
};

export default function EmployeeCitizenDetailPage() {
  const navigate = useNavigate();
  const { citizenId } = useParams<{ citizenId: string }>();

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [citizen, setCitizen] = useState<any>(null);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [showIntake, setShowIntake] = useState(false);
  const [capturedDoc, setCapturedDoc] = useState<CapturedDocument | null>(null);
  const ocrExtraction = useOcrExtraction();
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [saveDocFeedback, setSaveDocFeedback] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  function handleDocumentReady(file: File, source: IntakeSource) {
    if (capturedDoc) URL.revokeObjectURL(capturedDoc.previewUrl);
    setCapturedDoc({ file, source, previewUrl: URL.createObjectURL(file) });
    setShowIntake(false);
    setSaveDocFeedback(null);
    ocrExtraction.runExtraction(file);
  }

  function handleDiscardCapture() {
    if (capturedDoc) URL.revokeObjectURL(capturedDoc.previewUrl);
    setCapturedDoc(null);
    setSaveDocFeedback(null);
    ocrExtraction.reset();
  }

  async function handleSaveDocument() {
    if (!capturedDoc || !citizen || !employee) return;
    setIsSavingDoc(true);
    setSaveDocFeedback(null);

    try {
      const uploaded = await uploadDocumentFile(capturedDoc.file, citizen.branch_id, citizen.id);
      const result = await createDocument({
        citizenId: citizen.id,
        branchId: citizen.branch_id,
        intakeSource: capturedDoc.source,
        documentType: ocrExtraction.data?.documentType ?? "",
        storagePath: uploaded.storagePath,
        storageBucket: uploaded.storageBucket,
        originalFilename: capturedDoc.file.name,
        mimeType: capturedDoc.file.type,
        fileSizeBytes: capturedDoc.file.size,
        ocrRawText: ocrExtraction.data?.rawText ?? null,
        ocrConfidence: ocrExtraction.data?.confidenceScore ?? null,
        extractedData: ocrExtraction.data,
        uploadedBy: employee.id,
      });

      if (!result.success) {
        setSaveDocFeedback({ type: "error", text: result.message ?? "تعذر حفظ المستند" });
        return;
      }

      URL.revokeObjectURL(capturedDoc.previewUrl);
      setCapturedDoc(null);
      ocrExtraction.reset();
      setSaveDocFeedback({ type: "success", text: "تم رفع المستند وحفظه، بانتظار المراجعة" });
    } catch {
      setSaveDocFeedback({ type: "error", text: "تعذر رفع الملف إلى التخزين" });
    } finally {
      setIsSavingDoc(false);
    }
  }

  async function loadAll() {
    if (!citizenId) return;
    const [emp, c, decl, appt, txn, txnTypes] = await Promise.all([
      getCurrentEmployee(),
      getCitizenById(citizenId),
      getCitizenDeclarations(citizenId),
      getCitizenAppointments(citizenId),
      getCitizenTransactions(citizenId),
      listTransactionTypes(),
    ]);

    if (!emp) {
      navigate("/employee/login");
      return;
    }

    setEmployee(emp);
    setCitizen(c);
    setDeclarations(decl);
    setAppointments(appt);
    setTransactions(txn);
    setTypes(txnTypes);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenId]);

  async function handleCreateTransaction() {
    if (!citizen || !selectedTypeId) return;
    setIsCreating(true);
    setFeedback(null);

    const result = await createTransactionForCitizen(
      citizen.id,
      citizen.branch_id,
      selectedTypeId,
      notes
    );

    setIsCreating(false);

    if (!result.success) {
      setFeedback({ type: "error", text: result.message ?? "تعذر إنشاء المعاملة" });
      return;
    }

    setFeedback({ type: "success", text: "تم إنشاء المعاملة بنجاح" });
    setSelectedTypeId("");
    setNotes("");
    await loadAll();
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F5F6F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
      </div>
    );
  }

  if (!citizen) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F5F6F7] px-6 text-center">
        <p className="text-sm font-semibold text-[#C0392B]">تعذر العثور على هذا المواطن</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F6F7] pb-10 font-cairo">
      <header className="flex items-center gap-3 bg-[#17212B] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-white">
          ←
        </button>
        <h1 className="text-base font-bold text-white">ملف المواطن</h1>
      </header>

      <main className="flex flex-col gap-4 px-6 py-5">
        <section className="rounded-2xl border border-[#E2E7EB] bg-white p-5">
          <p className="text-xs font-semibold text-[#687581]">الاسم الرباعي</p>
          <p className="mt-1 text-base font-bold text-[#17212B]">{citizen.full_name}</p>
          <div className="my-3 h-px bg-[#E2E7EB]" />
          <p className="text-xs font-semibold text-[#687581]">رقم المعاش</p>
          <p className="mt-1 text-base font-bold text-[#17212B]">{citizen.pension_number}</p>
          <div className="my-3 h-px bg-[#E2E7EB]" />
          <p className="text-xs font-semibold text-[#687581]">الحالة</p>
          <p className="mt-1 text-base font-bold text-[#16803C]">
            {citizen.status === "active" ? "نشط" : citizen.status === "suspended" ? "موقوف" : "مؤرشف"}
          </p>
        </section>

        <section className="rounded-2xl border border-[#E2E7EB] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#17212B]">إدخال مستند جديد</h2>
            {!showIntake && (
              <button
                onClick={() => setShowIntake(true)}
                className="text-[13px] font-bold text-[#123F63]"
              >
                + إضافة مستند
              </button>
            )}
          </div>

          {showIntake && (
            <div className="mt-4">
              <IntakePanel onDocumentReady={handleDocumentReady} />
              <button
                onClick={() => setShowIntake(false)}
                className="mt-3 text-[13px] font-semibold text-[#687581]"
              >
                إلغاء
              </button>
            </div>
          )}

          {capturedDoc && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E2E7EB] bg-[#FAFBFC] p-3">
              {capturedDoc.file.type === "application/pdf" ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-xl">
                  📄
                </div>
              ) : (
                <img
                  src={capturedDoc.previewUrl}
                  alt="معاينة المستند"
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#17212B]">
                  {capturedDoc.file.name}
                </p>
                <p className="text-[12px] font-medium text-[#687581]">
                  {ocrExtraction.status === "processing" && "جارٍ استخراج البيانات..."}
                  {ocrExtraction.status === "unsupported" &&
                    "استخراج النص من PDF غير مدعوم بعد، أدخل البيانات يدوياً"}
                  {ocrExtraction.status === "error" && ocrExtraction.errorMessage}
                  {ocrExtraction.status === "done" && "تم استخراج البيانات — راجعها ثم احفظ في الأرشيف"}
                  {ocrExtraction.status === "idle" && "بانتظار المعالجة"}
                </p>
              </div>
              <button
                onClick={handleDiscardCapture}
                aria-label="إزالة المستند"
                className="shrink-0 text-[13px] font-bold text-[#C0392B]"
              >
                إزالة
              </button>
            </div>
          )}

          {ocrExtraction.status === "processing" && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#FAFBFC] p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
              <span className="text-[13px] font-semibold text-[#687581]">
                تحليل المستند بواسطة OCR...
              </span>
            </div>
          )}

          {ocrExtraction.status === "done" && ocrExtraction.data && (
            <div className="mt-3 rounded-xl border border-[#E2E7EB] bg-[#FAFBFC] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold text-[#17212B]">الحقول المستخرجة</p>
                <span className="text-[12px] font-semibold text-[#687581]">
                  نسبة الثقة: {Math.round(ocrExtraction.data.confidenceScore * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {Object.entries(ocrExtraction.data).map(([key, value]) => {
                  const label = EXTRACTED_FIELD_LABELS[key];
                  if (!label) return null;
                  const display = value === null || value === "" ? "—" : String(value);
                  return (
                    <div key={key}>
                      <p className="text-[11px] font-semibold text-[#9CA3AF]">{label}</p>
                      <p className="truncate text-[13px] font-bold text-[#17212B]">{display}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {capturedDoc && ocrExtraction.status !== "processing" && (
            <Button
              onClick={handleSaveDocument}
              isLoading={isSavingDoc}
              className="mt-3"
            >
              حفظ المستند في الأرشيف
            </Button>
          )}

          {saveDocFeedback && (
            <div
              className={`mt-3 rounded-xl p-3 text-center text-[13px] font-semibold ${
                saveDocFeedback.type === "success"
                  ? "bg-[#EAF7F0] text-[#16803C]"
                  : "bg-[#FBEAE8] text-[#C0392B]"
              }`}
            >
              {saveDocFeedback.text}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[#17212B]">الإقرارات السنوية</h2>
          {declarations.length === 0 ? (
            <p className="text-[13px] font-medium text-[#9CA3AF]">لا توجد إقرارات مسجّلة</p>
          ) : (
            <div className="flex flex-col gap-2">
              {declarations.map((d) => (
                <div key={d.id} className="rounded-xl border border-[#E2E7EB] bg-white p-3 text-[13px] font-semibold text-[#17212B]">
                  إقرار {d.declaration_year} — {d.status === "completed" ? "مكتمل" : "قيد التنفيذ"}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[#17212B]">المواعيد</h2>
          {appointments.length === 0 ? (
            <p className="text-[13px] font-medium text-[#9CA3AF]">لا توجد مواعيد</p>
          ) : (
            <div className="flex flex-col gap-2">
              {appointments.map((a) => (
                <div key={a.id} className="rounded-xl border border-[#E2E7EB] bg-white p-3 text-[13px] font-semibold text-[#17212B]">
                  {a.appointment_date} — {a.appointment_time}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[#17212B]">المعاملات</h2>
          {transactions.length === 0 ? (
            <p className="text-[13px] font-medium text-[#9CA3AF]">لا توجد معاملات</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-[#E2E7EB] bg-white p-3"
                >
                  <span className="text-[13px] font-semibold text-[#17212B]">
                    {t.transaction_types?.name_ar ?? "معاملة"}
                  </span>
                  <StatusBadge status={t.status as TransactionStatus} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E2E7EB] bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-[#17212B]">إنشاء معاملة جديدة</h2>

          <Select
            id="txnType"
            label="نوع المعاملة"
            placeholder="اختر نوع المعاملة"
            options={types.map((t) => ({ value: t.id, label: t.nameAr }))}
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          />

          <label htmlFor="notes" className="mb-1.5 mt-4 block text-sm font-semibold text-[#17212B]">
            ملاحظات (اختياري)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#E2E7EB] p-3 text-sm font-medium text-[#17212B] outline-none focus:border-[#123F63]"
          />

          {feedback && (
            <div
              className={`mt-3 rounded-xl p-3 text-center text-[13px] font-semibold ${
                feedback.type === "success"
                  ? "bg-[#EAF7F0] text-[#16803C]"
                  : "bg-[#FBEAE8] text-[#C0392B]"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <Button
            onClick={handleCreateTransaction}
            isLoading={isCreating}
            disabled={!selectedTypeId}
            className="mt-4"
          >
            إنشاء المعاملة
          </Button>
        </section>
      </main>
    </div>
  );
}
