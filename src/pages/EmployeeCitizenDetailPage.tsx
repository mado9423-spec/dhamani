import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
} from "../services/employee-citizen.service";
import {
  getCurrentEmployee,
  listTransactionTypes,
  createTransactionForCitizen,
  EmployeeProfile,
  TransactionType,
} from "../services/employee.service";

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
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-semibold text-ink-soft">الاسم الرباعي</p>
          <p className="mt-1 text-base font-bold text-ink">{citizen.full_name}</p>
          <div className="my-3 h-px bg-line" />
          <p className="text-xs font-semibold text-ink-soft">رقم المعاش</p>
          <p className="mt-1 text-base font-bold tabular-nums text-ink">{citizen.pension_number}</p>
          <div className="my-3 h-px bg-line" />
          <p className="text-xs font-semibold text-ink-soft">الحالة</p>
          <p className="mt-1 text-base font-bold text-success">
            {citizen.status === "active" ? "نشط" : citizen.status === "suspended" ? "موقوف" : "مؤرشف"}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">الإقرارات السنوية</h2>
          {declarations.length === 0 ? (
            <p className="text-[13px] font-medium text-ink-faint">لا توجد إقرارات مسجّلة</p>
          ) : (
            <div className="flex flex-col gap-2">
              {declarations.map((d) => (
                <div key={d.id} className="rounded-xl border border-line bg-surface p-3 text-[13px] font-semibold text-ink">
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
                <div key={a.id} className="rounded-xl border border-line bg-surface p-3 text-[13px] font-semibold tabular-nums text-ink">
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
            <div className="flex flex-col gap-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface p-3"
                >
                  <span className="text-[13px] font-semibold text-ink">
                    {t.transaction_types?.name_ar ?? "معاملة"}
                  </span>
                  <StatusBadge status={t.status as TransactionStatus} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
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
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm font-medium text-ink outline-none transition-colors focus:border-primary"
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
