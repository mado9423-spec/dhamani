import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StepIndicator } from "../components/StepIndicator";
import { Button } from "../components/ui/Button";
import { LiveVerificationCamera } from "../components/LiveVerificationCamera";
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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F6F8FA]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
      </div>
    );
  }

  if (!citizen) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-6 text-center">
        <p className="text-sm font-semibold text-[#C0392B]">
          تعذر تحميل بياناتك، يرجى تسجيل الدخول مجدداً
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F8FA] font-cairo">
      <header className="flex items-center gap-3 border-b border-[#E2E7EB] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-[#17212B]">
          ←
        </button>
        <h1 className="text-base font-bold text-[#17212B]">الإقرار السنوي</h1>
      </header>

      <StepIndicator steps={STEPS} currentStep={step} />

      <main className="px-6 pb-10 pt-2">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#E2E7EB] bg-white p-5">
              <p className="text-xs font-semibold text-[#687581]">الاسم الرباعي</p>
              <p className="mt-1 text-base font-bold text-[#17212B]">{citizen.fullName}</p>
              <div className="my-4 h-px bg-[#E2E7EB]" />
              <p className="text-xs font-semibold text-[#687581]">رقم المعاش</p>
              <p className="mt-1 text-base font-bold text-[#17212B]">{citizen.pensionNumber}</p>
            </div>
            <p className="text-[13px] font-medium text-[#687581]">
              تأكد أن بياناتك أعلاه صحيحة قبل المتابعة لاختيار موعد الإقرار.
            </p>
            <Button onClick={() => setStep(1)}>متابعة</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#17212B]">اختر الموعد المناسب</p>
            {errorMessage && (
              <div className="animate-fade-in-up rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
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
                      ? "border-[#123F63] bg-[#E8EEF4] text-[#123F63]"
                      : "border-[#E2E7EB] bg-white text-[#17212B]"
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
            <div className="rounded-2xl border border-[#E2E7EB] bg-white p-5">
              <p className="text-xs font-semibold text-[#687581]">الموعد المختار</p>
              <p className="mt-1 text-base font-bold text-[#17212B]">{selectedSlot.label}</p>
              <div className="my-4 h-px bg-[#E2E7EB]" />
              <p className="text-xs font-semibold text-[#687581]">حالة التحقق</p>
              <p className="mt-1 text-base font-bold text-[#16803C]">تم التحقق بنجاح</p>
            </div>

            {errorMessage && (
              <div className="animate-fade-in-up rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
                {errorMessage}
              </div>
            )}

            <Button onClick={handleConfirm} isLoading={isSubmitting}>
              تأكيد الإقرار السنوي
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="flex animate-fade-in-up flex-col items-center gap-3 pt-10 text-center">
            <div className="flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-[#EAF7F0] text-3xl text-[#16803C]">
              ✓
            </div>
            <p className="text-lg font-extrabold text-[#17212B]">
              تم تسجيل إقرارك السنوي بنجاح
            </p>
            <p className="max-w-xs text-[13px] font-medium text-[#687581]">
              يمكنك متابعة حالة إقرارك من صفحة "معاملاتي" في أي وقت.
            </p>
            <Button onClick={() => navigate("/home")} className="mt-4">
              العودة للرئيسية
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
