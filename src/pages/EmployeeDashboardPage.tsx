import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { PageShell } from "../components/PageShell";
import {
  getCurrentEmployee,
  searchCitizenByPensionNumber,
  EmployeeProfile,
  CitizenSearchResult,
} from "../services/employee.service";

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  const [pensionNumber, setPensionNumber] = useState("");
  const [result, setResult] = useState<CitizenSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getCurrentEmployee().then((data) => {
      if (!data) {
        navigate("/employee/login");
        return;
      }
      setEmployee(data);
      setIsLoadingEmployee(false);
    });
  }, [navigate]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!pensionNumber.trim()) return;

    setIsSearching(true);
    setSearched(false);
    const found = await searchCitizenByPensionNumber(pensionNumber);
    setResult(found);
    setSearched(true);
    setIsSearching(false);
  }

  if (isLoadingEmployee) {
    return (
      <PageShell bg="bg-primary-dark" className="items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header className="bg-primary-dark px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">لوحة الموظف</p>
        <h1 className="mt-1.5 text-lg font-bold text-white">
          {employee?.fullName}
        </h1>
        <p className="mt-1 text-[12px] font-medium tabular-nums text-white/50">
          رقم الموظف: {employee?.employeeNumber} •{" "}
          {employee?.role === "admin"
            ? "أدمن"
            : employee?.role === "supervisor"
              ? "مشرف"
              : "موظف"}
        </p>
      </header>

      <main className="px-6 py-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <TextField
            id="pensionSearch"
            label="البحث عن مواطن برقم المعاش"
            placeholder="أدخل رقم المعاش"
            value={pensionNumber}
            onChange={(e) => setPensionNumber(e.target.value)}
            className="tabular-nums"
          />
          <Button type="submit" isLoading={isSearching}>
            بحث
          </Button>
        </form>

        {searched && !result && (
          <div className="mt-6 rounded-2xl bg-danger-light p-4 text-center text-sm font-semibold text-danger">
            لا يوجد مواطن بهذا الرقم في نطاق صلاحياتك
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-ink-soft">الاسم الرباعي</p>
            <p className="mt-1 text-base font-bold text-ink">{result.fullName}</p>
            <div className="my-3 h-px bg-line" />
            <p className="text-xs font-semibold text-ink-soft">رقم المعاش</p>
            <p className="mt-1 text-base font-bold tabular-nums text-ink">{result.pensionNumber}</p>

            <Button
              onClick={() => navigate(`/employee/citizens/${result.id}`)}
              className="mt-5"
            >
              عرض التفاصيل الكاملة
            </Button>
          </div>
        )}
      </main>
    </PageShell>
  );
}
