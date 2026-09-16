import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentEmployerOfficer,
  getEmployer,
  listEmployments,
  EmployerOfficerProfile,
  EmployerProfile,
  EmploymentRecord,
} from "../services/employer.service";

const EMPLOYER_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "نشطة", bg: "#EAF7F0", text: "#16803C" },
  pending: { label: "قيد المراجعة", bg: "#FBF3E1", text: "#B8860B" },
  suspended: { label: "معلّقة", bg: "#FBEAE8", text: "#C0392B" },
};

const EMPLOYMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "نشط", bg: "#EAF7F0", text: "#16803C" },
  ended: { label: "منتهٍ", bg: "#F3F4F6", text: "#687581" },
};

function Badge({ config }: { config: { label: string; bg: string; text: string } }) {
  return (
    <span
      className="inline-flex animate-scale-in items-center rounded-full px-3 py-1 text-[12px] font-bold"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

export default function EmployerDashboardPage() {
  const navigate = useNavigate();
  const [officer, setOfficer] = useState<EmployerOfficerProfile | null>(null);
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [employments, setEmployments] = useState<EmploymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentEmployerOfficer().then(async (officerData) => {
      if (!officerData) {
        navigate("/employer/login");
        return;
      }
      setOfficer(officerData);

      const [employerData, employmentsData] = await Promise.all([
        getEmployer(officerData.employerId),
        listEmployments(officerData.employerId),
      ]);

      setEmployer(employerData);
      setEmployments(employmentsData);
      setIsLoading(false);
    });
  }, [navigate]);

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#17212B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F6F7] font-cairo">
      <header className="animate-fade-in-up bg-[#17212B] px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-white/60">بوابة جهات العمل</p>
            <h1 className="mt-1 text-lg font-bold text-white">{officer?.fullName}</h1>
            <p className="mt-0.5 text-[12px] font-medium text-white/50">
              رقم المسؤول: {officer?.officerNumber} •{" "}
              {officer?.role === "admin" ? "مسؤول رئيسي" : "مسؤول"}
            </p>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {!employer ? (
          <div className="animate-fade-in-up rounded-2xl bg-[#FBEAE8] p-4 text-center text-sm font-semibold text-[#C0392B]">
            تعذر تحميل بيانات جهة العمل
          </div>
        ) : (
          <div className="animate-fade-in-up rounded-2xl border border-[#E2E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#687581]">اسم جهة العمل</p>
                <p className="mt-1 text-base font-bold text-[#17212B]">{employer.name}</p>
              </div>
              <Badge config={EMPLOYER_STATUS_CONFIG[employer.status]} />
            </div>
            <div className="my-4 h-px bg-[#E2E7EB]" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#687581]">النوع</p>
                <p className="mt-1 text-[13px] font-bold text-[#17212B]">{employer.type}</p>
              </div>
              {employer.commercialRegisterNo && (
                <div>
                  <p className="text-xs font-semibold text-[#687581]">رقم السجل التجاري</p>
                  <p className="mt-1 text-[13px] font-bold text-[#17212B]">
                    {employer.commercialRegisterNo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-6 text-sm font-bold text-[#17212B]">
          الموظفون المسجَّلون ({employments.length})
        </h2>

        {employments.length === 0 ? (
          <div className="flex animate-fade-in-up flex-col items-center gap-2 pt-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF4] text-2xl">
              👥
            </div>
            <p className="text-sm font-bold text-[#17212B]">لا يوجد موظفون مسجَّلون بعد</p>
            <p className="max-w-xs text-[13px] font-medium text-[#687581]">
              ستظهر هنا بيانات أي موظف يسجّله الفرع تحت جهة عملك.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {employments.map((emp, index) => (
              <div
                key={emp.id}
                className="flex animate-fade-in-up flex-col gap-2 rounded-2xl border border-[#E2E7EB] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#17212B]">{emp.citizenFullName}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-[#687581]">
                      رقم المعاش: {emp.citizenPensionNumber}
                    </p>
                  </div>
                  <Badge config={EMPLOYMENT_STATUS_CONFIG[emp.status]} />
                </div>
                <div className="flex justify-between border-t border-[#F3F4F6] pt-2 text-[12px] font-medium text-[#9CA3AF]">
                  <span>تاريخ البدء: {emp.startDate}</span>
                  <span>الراتب الأساسي: {emp.salaryBase} د.ل</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
