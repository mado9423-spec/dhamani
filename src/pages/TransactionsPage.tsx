import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { StatusBadge } from "../components/StatusBadge";
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
    <div dir="rtl" className="min-h-screen bg-[#FAFBFC] pb-24 font-cairo">
      <header className="flex items-center gap-3 border-b border-[#E5E7EB] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-[#1A1D21]">
          ←
        </button>
        <h1 className="text-base font-bold text-[#1A1D21]">
          {isMilitaryOnly ? "معاملات التقاعد العسكري" : "متابعة المعاملات"}
        </h1>
      </header>

      <main className="px-6 py-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#E5E7EB]" />
            ))}
          </div>
        )}

        {!isLoading && visibleTransactions.length === 0 && (
          <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0F7] text-2xl">
              📄
            </div>
            <p className="text-sm font-bold text-[#1A1D21]">لا توجد معاملات حتى الآن</p>
            <p className="max-w-xs text-[13px] font-medium text-[#6B7280]">
              ستظهر هنا أي معاملة يفتحها لك موظف الفرع.
            </p>
          </div>
        )}

        {!isLoading && visibleTransactions.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleTransactions.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1A1D21]">{t.typeName}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">
                      رقم المعاملة: {t.transactionNumber}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex justify-between border-t border-[#F3F4F6] pt-2 text-[12px] font-medium text-[#9CA3AF]">
                  <span>تاريخ الإنشاء: {formatArabicDate(t.createdAt)}</span>
                  <span>آخر تحديث: {formatArabicDate(t.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
