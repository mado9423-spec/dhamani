import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#1A1D21]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F6F7] font-cairo">
      <header className="bg-[#1A1D21] px-6 py-5">
        <p className="text-xs font-semibold text-white/60">لوحة الموظف</p>
        <h1 className="mt-1 text-lg font-bold text-white">
          {employee?.fullName}
        </h1>
        <p className="mt-0.5 text-[12px] font-medium text-white/50">
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
          />
          <Button type="submit" isLoading={isSearching}>
            بحث
          </Button>
        </form>

        {searched && !result && (
          <div className="mt-6 rounded-2xl bg-[#FBEAE8] p-4 text-center text-sm font-semibold text-[#C0392B]">
            لا يوجد مواطن بهذا الرقم في نطاق صلاحياتك
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <p className="text-xs font-semibold text-[#6B7280]">الاسم الرباعي</p>
            <p className="mt-1 text-base font-bold text-[#1A1D21]">{result.fullName}</p>
            <div className="my-3 h-px bg-[#E5E7EB]" />
            <p className="text-xs font-semibold text-[#6B7280]">رقم المعاش</p>
            <p className="mt-1 text-base font-bold text-[#1A1D21]">{result.pensionNumber}</p>

            <Button
              onClick={() => navigate(`/employee/citizens/${result.id}`)}
              className="mt-5"
            >
              عرض التفاصيل الكاملة
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
