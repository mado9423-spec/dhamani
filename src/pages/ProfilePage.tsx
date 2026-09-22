import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/ui/Button";
import { getCitizenFullProfile, CitizenFullProfile } from "../services/citizen.service";
import { signOut } from "../services/auth.service";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "نشط", bg: "#EAF7F0", text: "#16803C" },
  suspended: { label: "موقوف", bg: "#FBEAE8", text: "#C0392B" },
  archived: { label: "مؤرشف", bg: "#EEF1F4", text: "#5B6875" },
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
      <PageShell className="items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell className="items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-semibold text-danger">تعذر تحميل بياناتك، يرجى تسجيل الدخول مجدداً</p>
        <Button onClick={() => navigate("/login")} className="max-w-xs">
          العودة لتسجيل الدخول
        </Button>
      </PageShell>
    );
  }

  const statusConfig = STATUS_CONFIG[profile.status];

  return (
    <PageShell className="pb-24">
      <PageHeader title="الملف الشخصي" />

      <main className="flex flex-col gap-4 px-6 py-6">
        <div className="animate-fade-in-up rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-soft">الاسم الرباعي</p>
              <p className="mt-1 text-base font-bold text-ink">{profile.fullName}</p>
            </div>
            <span
              className="inline-flex animate-scale-in items-center rounded-full px-3 py-1 text-[12px] font-bold"
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="my-4 h-px bg-line" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-ink-soft">رقم المعاش</p>
              <p className="mt-1 text-[13px] font-bold text-ink">{profile.pensionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-soft">الفرع</p>
              <p className="mt-1 text-[13px] font-bold text-ink">{profile.branchName}</p>
            </div>
            {profile.nationalId && (
              <div>
                <p className="text-xs font-semibold text-ink-soft">الرقم الوطني</p>
                <p className="mt-1 text-[13px] font-bold text-ink">{profile.nationalId}</p>
              </div>
            )}
            {profile.phone && (
              <div>
                <p className="text-xs font-semibold text-ink-soft">رقم الهاتف</p>
                <p className="mt-1 text-[13px] font-bold text-ink">{profile.phone}</p>
              </div>
            )}
            {profile.dateOfBirth && (
              <div>
                <p className="text-xs font-semibold text-ink-soft">تاريخ الميلاد</p>
                <p className="mt-1 text-[13px] font-bold text-ink">
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
    </PageShell>
  );
}
