import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/ui/Button";
import { getCitizenFullProfile, CitizenFullProfile } from "../services/citizen.service";
import { signOut } from "../services/auth.service";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "نشط", bg: "#EAF7F0", text: "#16803C" },
  suspended: { label: "موقوف", bg: "#FBEAE8", text: "#C0392B" },
  archived: { label: "مؤرشف", bg: "#F3F4F6", text: "#687581" },
};

function formatArabicBirthDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ar-LY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenFullProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    getCitizenFullProfile().then((data) => {
      setProfile(data);
      setIsLoading(false);
    });
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    navigate("/login");
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F6F8FA]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F8FA] px-6 text-center">
        <p className="text-sm font-semibold text-[#C0392B]">تعذر تحميل بياناتك، يرجى تسجيل الدخول مجدداً</p>
        <Button onClick={() => navigate("/login")} className="max-w-xs">
          العودة لتسجيل الدخول
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[profile.status];

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F8FA] pb-24 font-cairo">
      <header className="flex items-center gap-3 border-b border-[#E2E7EB] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-[#17212B]">
          ←
        </button>
        <h1 className="text-base font-bold text-[#17212B]">الملف الشخصي</h1>
      </header>

      <main className="flex flex-col gap-4 px-6 py-6">
        <div className="animate-fade-in-up rounded-2xl border border-[#E2E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#687581]">الاسم الرباعي</p>
              <p className="mt-1 text-base font-bold text-[#17212B]">{profile.fullName}</p>
            </div>
            <span
              className="inline-flex animate-scale-in items-center rounded-full px-3 py-1 text-[12px] font-bold"
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="my-4 h-px bg-[#E2E7EB]" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-[#687581]">رقم المعاش</p>
              <p className="mt-1 text-[13px] font-bold text-[#17212B]">{profile.pensionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#687581]">الفرع</p>
              <p className="mt-1 text-[13px] font-bold text-[#17212B]">{profile.branchName}</p>
            </div>
            {profile.nationalId && (
              <div>
                <p className="text-xs font-semibold text-[#687581]">الرقم الوطني</p>
                <p className="mt-1 text-[13px] font-bold text-[#17212B]">{profile.nationalId}</p>
              </div>
            )}
            {profile.phone && (
              <div>
                <p className="text-xs font-semibold text-[#687581]">رقم الهاتف</p>
                <p className="mt-1 text-[13px] font-bold text-[#17212B]">{profile.phone}</p>
              </div>
            )}
            {profile.dateOfBirth && (
              <div>
                <p className="text-xs font-semibold text-[#687581]">تاريخ الميلاد</p>
                <p className="mt-1 text-[13px] font-bold text-[#17212B]">
                  {formatArabicBirthDate(profile.dateOfBirth)}
                </p>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleSignOut}
          isLoading={isSigningOut}
          className="animate-fade-in-up [animation-delay:80ms]"
        >
          تسجيل الخروج
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
