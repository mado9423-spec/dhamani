import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StepIndicator } from "../components/StepIndicator";
import { Button } from "../components/ui/Button";
import { LiveVerificationCamera } from "../components/LiveVerificationCamera";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { getCurrentCitizen } from "../services/citizen.service";
import { CitizenProfile } from "../types/service";
import {
  AppointmentSlot,
  generateAvailableSlots,
  createDeclarationAppointment,
  submitAnnualDeclaration,
} from "../services/declaration.service";

const STEPS = ["البيانات", "الموعد", "التحقق", "التأكيد", "تم"];

type FlowStep = 0 | 1 | 2 | 3 | 4;

export default function DeclarationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<FlowStep>(0);
  const [citizen, setCitizen] = useState<CitizenProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [slots] = useState<AppointmentSlot[]>(generateAvailableSlots());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getCurrentCitizen().then((data) => {
      setCitizen(data);
      setIsLoading(false);
    });
  }, []);

  async function handleSelectSlot(slot: AppointmentSlot) {
    if (!citizen) return;
    setErrorMessage("");
    setSelectedSlot(slot);

    const appointment = await createDeclarationAppointment(
      citizen.id,
      citizen.branchId,
      slot
    );

    if (!appointment) {
      setErrorMessage("تعذر حجز الموعد، يرجى المحاولة مجدداً");
      return;
    }

    setAppointmentId(appointment.id);
    setStep(2);
  }

  function handleVerified() {
    setStep(3);
  }

  async function handleConfirm() {
    if (!citizen || !appointmentId) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await submitAnnualDeclaration(
      citizen.id,
      citizen.branchId,
      appointmentId
    );

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message ?? "تعذر إرسال الإقرار");
      return;
    }

    setStep(4);
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
        <p className="text-sm font-semibold text-danger">
          تعذر تحميل بياناتك، يرجى تسجيل الدخول مجدداً
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="الإقرار السنوي" />

      <StepIndicator steps={STEPS} currentStep={step} />

      <main className="px-6 pb-10 pt-2">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-ink-soft">الاسم الرباعي</p>
              <p className="mt-1 text-base font-bold text-ink">{citizen.fullName}</p>
              <div className="my-4 h-px bg-line" />
              <p className="text-xs font-semibold text-ink-soft">رقم المعاش</p>
              <p className="mt-1 text-base font-bold tabular-nums text-ink">{citizen.pensionNumber}</p>
            </div>
            <p className="text-[13px] font-medium leading-relaxed text-ink-soft">
              تأكد أن بياناتك أعلاه صحيحة قبل المتابعة لاختيار موعد الإقرار.
            </p>
            <Button onClick={() => setStep(1)}>متابعة</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink">اختر الموعد المناسب</p>
            {errorMessage && (
              <div className="rounded-xl bg-danger-light p-3 text-center text-[13px] font-semibold text-danger">
                {errorMessage}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {slots.map((slot) => (
                <button
                  key={`${slot.date}-${slot.time}`}
                  onClick={() => handleSelectSlot(slot)}
                  className={`rounded-xl border p-3 text-right text-sm font-semibold transition-colors ${
                    selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                      ? "border-primary bg-primary-light text-primary"
                      : "border-line bg-surface text-ink hover:border-primary/30"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <LiveVerificationCamera citizenId={citizen.id} onVerified={handleVerified} />
        )}

        {step === 3 && selectedSlot && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-ink-soft">الموعد المختار</p>
              <p className="mt-1 text-base font-bold text-ink">{selectedSlot.label}</p>
              <div className="my-4 h-px bg-line" />
              <p className="text-xs font-semibold text-ink-soft">حالة التحقق</p>
              <p className="mt-1 text-base font-bold text-success">تم التحقق بنجاح</p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-danger-light p-3 text-center text-[13px] font-semibold text-danger">
                {errorMessage}
              </div>
            )}

            <Button onClick={handleConfirm} isLoading={isSubmitting}>
              تأكيد الإقرار السنوي
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-3 pt-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-3xl text-success">
              ✓
            </div>
            <p className="text-lg font-extrabold text-ink">
              تم تسجيل إقرارك السنوي بنجاح
            </p>
            <p className="max-w-xs text-[13px] font-medium leading-relaxed text-ink-soft">
              يمكنك متابعة حالة إقرارك من صفحة "معاملاتي" في أي وقت.
            </p>
            <Button onClick={() => navigate("/home")} className="mt-4">
              العودة للرئيسية
            </Button>
          </div>
        )}
      </main>
    </PageShell>
  );
}
