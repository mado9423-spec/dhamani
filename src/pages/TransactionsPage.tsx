import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { StatusBadge } from "../components/StatusBadge";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import {
  listMyTransactions,
  formatArabicDate,
  TransactionRecord,
} from "../services/transaction.service";

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMilitaryOnly = location.pathname === "/transactions/military";

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMyTransactions().then((data) => {
      setTransactions(data);
      setIsLoading(false);
    });
  }, []);

  const visibleTransactions = isMilitaryOnly
    ? transactions.filter((t) => t.isMilitary)
    : transactions;

  return (
    <PageShell className="pb-24">
      <PageHeader title={isMilitaryOnly ? "معاملات التقاعد العسكري" : "متابعة المعاملات"} />

      <main className="px-6 py-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-shimmer rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        )}

        {!isLoading && visibleTransactions.length === 0 && (
          <div className="flex animate-fade-in-up flex-col items-center gap-2 pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-2xl">
              📄
            </div>
            <p className="text-sm font-bold text-ink">لا توجد معاملات حتى الآن</p>
            <p className="max-w-xs text-[13px] font-medium text-ink-soft">
              ستظهر هنا أي معاملة يفتحها لك موظف الفرع.
            </p>
          </div>
        )}

        {!isLoading && visibleTransactions.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleTransactions.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">{t.typeName}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-ink-soft">
                      رقم المعاملة: {t.transactionNumber}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex justify-between border-t border-line-soft pt-2 text-[12px] font-medium text-ink-faint">
                  <span>تاريخ الإنشاء: {formatArabicDate(t.createdAt)}</span>
                  <span>آخر تحديث: {formatArabicDate(t.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </PageShell>
  );
}
