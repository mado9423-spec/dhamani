import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import {
  getCurrentEmployee,
  searchCitizens,
  EmployeeProfile,
  CitizenSearchResult,
} from "../services/employee.service";

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitizenSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [newFileMode, setNewFileMode] = useState(false);
  const [newFileHint, setNewFileHint] = useState<string | null>(null);

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
    if (!query.trim()) return;

    setIsSearching(true);
    setSearched(false);
    setNewFileMode(false);
    setNewFileHint(null);
    const found = await searchCitizens(query);
    setResults(found);
    setSearched(true);
    setIsSearching(false);
  }

  function handleNewFileClick() {
    if (results.length === 0) {
      setNewFileHint("يرجى البحث عن المواطن أولاً ثم اختر ملفه من النتائج");
      return;
    }
    setNewFileHint(null);
    setNewFileMode(true);
  }

  function handleResultClick(citizenId: string) {
    navigate(newFileMode ? `/employee/citizens/${citizenId}?newFile=1` : `/employee/citizens/${citizenId}`);
  }

  if (isLoadingEmployee) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#17212B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F6F7] font-cairo">
      <header className="bg-[#17212B] px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
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
          </div>
          <button
            onClick={() => navigate("/employee/change-password")}
            className="mt-1 text-[12px] font-bold text-white/70"
          >
            تغيير كلمة المرور
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <TextField
            id="citizenSearch"
            label="البحث عن مواطن"
            placeholder="رقم المعاش، الرقم الوطني، أو الاسم"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" isLoading={isSearching}>
            بحث
          </Button>
        </form>

        <button
          onClick={handleNewFileClick}
          className={`mt-3 w-full rounded-xl border border-dashed py-3 text-sm font-bold transition-colors ${
            newFileMode
              ? "border-[#123F63] bg-[#E8EEF4] text-[#123F63]"
              : "border-[#123F63] text-[#123F63]"
          }`}
        >
          + ملف جديد
        </button>

        {newFileHint && (
          <p className="mt-2 text-center text-[13px] font-semibold text-[#B8860B]">
            {newFileHint}
          </p>
        )}

        {newFileMode && results.length > 0 && (
          <p className="mt-2 text-center text-[13px] font-semibold text-[#123F63]">
            اختر المواطن أدناه لفتح ملف جديد له
          </p>
        )}

        {searched && results.length === 0 && (
          <div className="mt-6 rounded-2xl bg-[#FBEAE8] p-4 text-center text-sm font-semibold text-[#C0392B]">
            لا يوجد مواطن مطابق في نطاق صلاحياتك
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {results.map((citizen) => (
              <button
                key={citizen.id}
                onClick={() => handleResultClick(citizen.id)}
                className="rounded-2xl border border-[#E2E7EB] bg-white p-5 text-right transition-colors active:bg-[#F5F6F7]"
              >
                <p className="text-xs font-semibold text-[#687581]">الاسم الرباعي</p>
                <p className="mt-1 text-base font-bold text-[#17212B]">{citizen.fullName}</p>
                <div className="my-3 h-px bg-[#E2E7EB]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#687581]">رقم المعاش</p>
                    <p className="mt-1 text-[13px] font-bold text-[#17212B]">
                      {citizen.pensionNumber}
                    </p>
                  </div>
                  {citizen.nationalId && (
                    <div>
                      <p className="text-xs font-semibold text-[#687581]">الرقم الوطني</p>
                      <p className="mt-1 text-[13px] font-bold text-[#17212B]">
                        {citizen.nationalId}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
