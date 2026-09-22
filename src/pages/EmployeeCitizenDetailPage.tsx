import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { StatusBadge, TransactionStatus } from "../components/StatusBadge";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import {
  getCitizenById,
  getCitizenDeclarations,
  getCitizenAppointments,
  getCitizenTransactions,
  issueActivationCode,
} from "../services/employee-citizen.service";
import {
  getCurrentEmployee,
  listTransactionTypes,
  createTransactionForCitizen,
  transitionTransactionStatus,
  EmployeeProfile,
  TransactionType,
} from "../services/employee.service";
import { WorkflowTracker } from "../components/WorkflowTracker";
import { IntakePanel } from "../features/digital-archive/components/IntakePanel";
import { VerificationScreen } from "../features/digital-archive/components/VerificationScreen";
import { IntakeSource, VerifiedFields } from "../features/digital-archive/types/archive.types";
import { useOcrExtraction } from "../features/digital-archive/hooks/useOcrExtraction";
import { uploadDocumentFile, getDocumentSignedUrl } from "../features/digital-archive/services/storageService";
import {
  createDocument,
  listCitizenDocuments,
  CitizenDocumentSummary,
} from "../features/digital-archive/services/document.service";
import { listAuditLogsForRecords, AuditLogEntry } from "../services/audit.service";

const DOCUMENT_REVIEW_STATUS_LABELS: Record<string, string> = {
  pending_review: "قيد المراجعة",
  reviewed: "تمت المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "إنشاء",
  transaction_status_changed: "تغيير حالة المعاملة",
  document_approved: "اعتماد مستند",
};

interface CapturedDocument {
  file: File;
  source: IntakeSource;
  previewUrl: string;
}

export default function EmployeeCitizenDetailPage() {
  const navigate = useNavigate();
  const { citizenId } = useParams<{ citizenId: string }>();
  const [searchParams] = useSearchParams();
  const wantsNewFile = searchParams.get("newFile") === "1";

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
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const [showIntake, setShowIntake] = useState(wantsNewFile);
  const [capturedDoc, setCapturedDoc] = useState<CapturedDocument | null>(null);
  const ocrExtraction = useOcrExtraction();
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [saveDocFeedback, setSaveDocFeedback] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  const [archivedDocuments, setArchivedDocuments] = useState<CitizenDocumentSummary[]>([]);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [viewDocError, setViewDocError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [activation, setActivation] = useState<{ code: string; expiresAt: string } | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  function handleRejectDocument() {
    handleDiscardCapture();
    setSaveDocFeedback({ type: "success", text: "تم إلغاء المستند، يمكنك إعادة المسح" });
  }

  async function handleApproveDocument(fields: VerifiedFields) {
    if (!capturedDoc || !citizen || !employee) return;
    setIsSavingDoc(true);
    setSaveDocFeedback(null);

    try {
      const uploaded = await uploadDocumentFile(capturedDoc.file, citizen.branch_id, citizen.id);
      const result = await createDocument({
        citizenId: citizen.id,
        branchId: citizen.branch_id,
        intakeSource: capturedDoc.source,
        documentType: fields.documentType,
        storagePath: uploaded.storagePath,
        storageBucket: uploaded.storageBucket,
        originalFilename: capturedDoc.file.name,
        mimeType: capturedDoc.file.type,
        fileSizeBytes: capturedDoc.file.size,
        ocrRawText: ocrExtraction.data?.rawText ?? null,
        ocrConfidence: ocrExtraction.data?.confidenceScore ?? null,
        extractedData: ocrExtraction.data,
        verifiedData: fields,
        reviewStatus: "approved",
        uploadedBy: employee.id,
        reviewedBy: employee.id,
        approvedBy: employee.id,
        approvedAt: new Date().toISOString(),
      });

      if (!result.success) {
        setSaveDocFeedback({ type: "error", text: result.message ?? "تعذر حفظ المستند" });
        return;
      }

      URL.revokeObjectURL(capturedDoc.previewUrl);
      setCapturedDoc(null);
      ocrExtraction.reset();
      setSaveDocFeedback({ type: "success", text: "تم اعتماد المستند وحفظه في الأرشيف" });
      await loadAll();
    } catch {
      setSaveDocFeedback({ type: "error", text: "تعذر رفع الملف إلى التخزين" });
    } finally {
      setIsSavingDoc(false);
    }
  }

  async function loadAll() {
    if (!citizenId) return;
    const [emp, c, decl, appt, txn, txnTypes, docs] = await Promise.all([
      getCurrentEmployee(),
      getCitizenById(citizenId),
      getCitizenDeclarations(citizenId),
      getCitizenAppointments(citizenId),
      getCitizenTransactions(citizenId),
      listTransactionTypes(),
      listCitizenDocuments(citizenId),
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
    setArchivedDocuments(docs);
    setIsLoading(false);

    if (emp.role === "admin" || emp.role === "supervisor") {
      const recordIds = [...txn.map((t) => t.id), ...docs.map((d) => d.id)];
      setAuditLogs(await listAuditLogsForRecords(recordIds));
    } else {
      setAuditLogs([]);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenId]);

  async function handleCreateTransaction() {
    if (!citizen || !selectedTypeId || !employee) return;
    setIsCreating(true);
    setFeedback(null);

    const result = await createTransactionForCitizen(
      citizen.id,
      citizen.branch_id,
      selectedTypeId,
      notes,
      employee.id
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

  async function handleViewDocument(storagePath: string, documentId: string) {
    setViewingDocId(documentId);
    setViewDocError(null);
    try {
      const url = await getDocumentSignedUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setViewDocError("تعذر فتح المستند");
    } finally {
      setViewingDocId(null);
    }
  }

  async function handleTransitionStatus(
    transactionId: string,
    previousStatus: TransactionStatus,
    newStatus: TransactionStatus
  ) {
    if (!employee) return;
    setTransitioningId(transactionId);
    const result = await transitionTransactionStatus(
      transactionId,
      previousStatus,
      newStatus,
      employee.id
    );
    setTransitioningId(null);
    if (result.success) {
      await loadAll();
    }
  }

  async function handleIssueActivation() {
    if (!citizen) return;
    setIsIssuing(true);
    setActivationError(null);
    setCopied(false);

    const result = await issueActivationCode(citizen.id);

    setIsIssuing(false);

    if (!result.success || !result.code) {
      setActivation(null);
      setActivationError(result.message ?? "تعذر إصدار رمز التفعيل");
      return;
    }

    setActivation({ code: result.code, expiresAt: result.expiresAt ?? "" });
  }

  async function handleCopyCode() {
    if (!activation) return;
    try {
      await navigator.clipboard.writeText(activation.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (isLoading) {
    return (
      <PageShell className="items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </PageShell>
    );
  }

  if (!citizen) {
    return (
      <PageShell className="items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-danger">تعذر العثور على هذا المواطن</p>
      </PageShell>
    );
  }

  return (
    <PageShell className="pb-10">
      <PageHeader title="ملف المواطن" tone="dark" />

      <main className="flex flex-col gap-4 px-6 py-5">
        <section className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold text-ink-soft">الاسم الرباعي</p>
          <p className="mt-1 text-base font-bold text-ink">{citizen.full_name}</p>
          <div className="my-3 h-px bg-line" />
          <p className="text-xs font-semibold text-ink-soft">رقم المعاش</p>
          <p className="mt-1 text-base font-bold text-ink">{citizen.pension_number}</p>
          <div className="my-3 h-px bg-line" />
          <p className="text-xs font-semibold text-ink-soft">الحالة</p>
          <p className="mt-1 text-base font-bold text-success">
            {citizen.status === "active" ? "نشط" : citizen.status === "suspended" ? "موقوف" : "مؤرشف"}
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">ملف جديد</h2>
            {!showIntake && (
              <button
                onClick={() => setShowIntake(true)}
                className="text-[13px] font-bold text-primary"
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
                className="mt-3 text-[13px] font-semibold text-ink-soft"
              >
                إلغاء
              </button>
            </div>
          )}

          {capturedDoc && ocrExtraction.status === "processing" && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-line-soft p-3">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" />
              <p className="truncate text-[13px] font-semibold text-ink-soft">
                جارٍ تحليل «{capturedDoc.file.name}» بواسطة OCR...
              </p>
            </div>
          )}

          {capturedDoc && ocrExtraction.status !== "processing" && (
            <div className="mt-4">
              {ocrExtraction.status === "unsupported" && (
                <p className="mb-3 text-[13px] font-semibold text-accent">
                  صيغة الملف غير مدعومة للاستخراج التلقائي، يرجى إدخال الحقول يدوياً
                </p>
              )}
              {ocrExtraction.status === "error" && (
                <p className="mb-3 text-[13px] font-semibold text-danger">
                  {ocrExtraction.errorMessage}
                </p>
              )}
              {ocrExtraction.status === "done" && ocrExtraction.data && (
                <p className="mb-3 text-[13px] font-semibold text-ink-soft">
                  نسبة ثقة الاستخراج: {Math.round(ocrExtraction.data.confidenceScore * 100)}% — راجع
                  الحقول أدناه قبل الاعتماد
                </p>
              )}
              <VerificationScreen
                file={capturedDoc.file}
                previewUrl={capturedDoc.previewUrl}
                initialData={ocrExtraction.data}
                isSubmitting={isSavingDoc}
                onApprove={handleApproveDocument}
                onReject={handleRejectDocument}
              />
            </div>
          )}

          {saveDocFeedback && (
            <div
              className={`mt-3 rounded-xl p-3 text-center text-[13px] font-semibold ${
                saveDocFeedback.type === "success"
                  ? "bg-success-light text-success"
                  : "bg-danger-light text-danger"
              }`}
            >
              {saveDocFeedback.text}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">الإقرارات السنوية</h2>
          {declarations.length === 0 ? (
            <p className="text-[13px] font-medium text-ink-faint">لا توجد إقرارات مسجّلة</p>
          ) : (
            <div className="flex flex-col gap-2">
              {declarations.map((d) => (
                <div key={d.id} className="rounded-xl border border-line bg-white p-3 text-[13px] font-semibold text-ink">
                  إقرار {d.declaration_year} — {d.status === "completed" ? "مكتمل" : "قيد التنفيذ"}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">المواعيد</h2>
          {appointments.length === 0 ? (
            <p className="text-[13px] font-medium text-ink-faint">لا توجد مواعيد</p>
          ) : (
            <div className="flex flex-col gap-2">
              {appointments.map((a) => (
                <div key={a.id} className="rounded-xl border border-line bg-white p-3 text-[13px] font-semibold text-ink">
                  {a.appointment_date} — {a.appointment_time}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">المعاملات</h2>
          {transactions.length === 0 ? (
            <p className="text-[13px] font-medium text-ink-faint">لا توجد معاملات</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => {
                const status = t.status as TransactionStatus;
                const isTransitioning = transitioningId === t.id;
                return (
                  <div key={t.id} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">
                        {t.transaction_types?.name_ar ?? "معاملة"}
                      </span>
                      <StatusBadge status={status} />
                    </div>

                    <div className="mt-3">
                      <WorkflowTracker status={status} />
                    </div>

                    {(status === "pending_review" || status === "accepted") && (
                      <div className="mt-3 flex gap-2">
                        {status === "pending_review" && (
                          <button
                            onClick={() => handleTransitionStatus(t.id, status, "accepted")}
                            disabled={isTransitioning}
                            className="h-9 flex-1 rounded-lg bg-primary text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
                          >
                            قبول
                          </button>
                        )}
                        {status === "accepted" && (
                          <button
                            onClick={() => handleTransitionStatus(t.id, status, "completed")}
                            disabled={isTransitioning}
                            className="h-9 flex-1 rounded-lg bg-primary text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
                          >
                            إكمال
                          </button>
                        )}
                        <button
                          onClick={() => handleTransitionStatus(t.id, status, "rejected")}
                          disabled={isTransitioning}
                          className="h-9 flex-1 rounded-lg border border-line text-[12px] font-bold text-danger transition-opacity disabled:opacity-50"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">المستندات المؤرشفة</h2>
          {archivedDocuments.length === 0 ? (
            <p className="text-[13px] font-medium text-ink-faint">لا توجد مستندات مؤرشفة</p>
          ) : (
            <div className="flex flex-col gap-2">
              {archivedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {doc.documentType || doc.originalFilename || "مستند"}
                    </p>
                    <p className="text-[11px] font-medium text-ink-faint">
                      {DOCUMENT_REVIEW_STATUS_LABELS[doc.reviewStatus] ?? doc.reviewStatus}
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewDocument(doc.storagePath, doc.id)}
                    disabled={viewingDocId === doc.id}
                    className="shrink-0 text-[13px] font-bold text-primary disabled:opacity-50"
                  >
                    {viewingDocId === doc.id ? "..." : "عرض"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {viewDocError && (
            <p className="mt-2 text-[13px] font-semibold text-danger">{viewDocError}</p>
          )}
        </section>

        {(employee?.role === "admin" || employee?.role === "supervisor") && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-ink">سجل التدقيق</h2>
            {auditLogs.length === 0 ? (
              <p className="text-[13px] font-medium text-ink-faint">لا توجد سجلات تدقيق</p>
            ) : (
              <div className="flex flex-col gap-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-line bg-white p-3 text-[13px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">
                        {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-[11px] font-medium text-ink-faint">
                        {new Date(log.createdAt).toLocaleString("ar-LY")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-ink">تفعيل حساب المواطن</h2>
          <p className="mb-3 text-[13px] font-medium text-ink-soft">
            تحقق من هوية المواطن أولًا، ثم أصدر له رمزًا يستعمله مرة واحدة لتعيين رقمه السري.
            الرمز صالح 72 ساعة، ويظهر لك الآن فقط.
          </p>

          {citizen.status !== "active" && (
            <p className="mb-3 text-[13px] font-semibold text-danger">
              لا يمكن إصدار رمز لحساب غير نشط
            </p>
          )}

          {activation && (
            <div className="mb-3 rounded-xl bg-primary/5 p-4 text-center">
              <p className="text-xs font-semibold text-ink-soft">رمز التفعيل</p>
              <p dir="ltr" className="mt-1 text-2xl font-extrabold tracking-widest text-ink">
                {activation.code}
              </p>
              {activation.expiresAt && (
                <p className="mt-1 text-[12px] font-medium text-ink-soft">
                  صالح حتى {new Date(activation.expiresAt).toLocaleString("ar")}
                </p>
              )}
              <button
                type="button"
                onClick={handleCopyCode}
                className="mt-2 text-sm font-semibold text-primary hover:underline"
              >
                {copied ? "تم النسخ" : "نسخ الرمز"}
              </button>
            </div>
          )}

          {activationError && (
            <div className="mb-3 rounded-xl bg-danger-light p-3 text-center text-[13px] font-semibold text-danger">
              {activationError}
            </div>
          )}

          <Button
            onClick={handleIssueActivation}
            isLoading={isIssuing}
            disabled={citizen.status !== "active"}
          >
            {activation ? "إصدار رمز جديد (يلغي السابق)" : "إصدار رمز تفعيل"}
          </Button>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">إنشاء معاملة جديدة</h2>

          <Select
            id="txnType"
            label="نوع المعاملة"
            placeholder="اختر نوع المعاملة"
            options={types.map((t) => ({ value: t.id, label: t.nameAr }))}
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          />

          <label htmlFor="notes" className="mb-1.5 mt-4 block text-sm font-semibold text-ink">
            ملاحظات (اختياري)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-line p-3 text-sm font-medium text-ink outline-none focus:border-primary"
          />

          {feedback && (
            <div
              className={`mt-3 rounded-xl p-3 text-center text-[13px] font-semibold ${
                feedback.type === "success"
                  ? "bg-success-light text-success"
                  : "bg-danger-light text-danger"
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
    </PageShell>
  );
}
