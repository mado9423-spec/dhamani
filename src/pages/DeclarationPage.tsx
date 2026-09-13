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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#FAFBFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#0B3D66]" />
      </div>
    );
  }

  if (!citizen) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#FAFBFC] px-6 text-center">
        <p className="text-sm font-semibold text-[#C0392B]">
          تعذر تحميل بياناتك، يرجى تسجيل الدخول مجدداً
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFBFC] font-cairo">
      <header className="flex items-center gap-3 border-b border-[#E5E7EB] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-[#1A1D21]">
          ←
        </button>
        <h1 className="text-base font-bold text-[#1A1D21]">الإقرار السنوي</h1>
      </header>

      <StepIndicator steps={STEPS} currentStep={step} />

      <main className="px-6 pb-10 pt-2">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-xs font-semibold text-[#6B7280]">الاسم الرباعي</p>
              <p className="mt-1 text-base font-bold text-[#1A1D21]">{citizen.fullName}</p>
              <div className="my-4 h-px bg-[#E5E7EB]" />
              <p className="text-xs font-semibold text-[#6B7280]">رقم المعاش</p>
              <p className="mt-1 text-base font-bold text-[#1A1D21]">{citizen.pensionNumber}</p>
            </div>
            <p className="text-[13px] font-medium text-[#6B7280]">
              تأكد أن بياناتك أعلاه صحيحة قبل المتابعة لاختيار موعد الإقرار.
            </p>
            <Button onClick={() => setStep(1)}>متابعة</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#1A1D21]">اختر الموعد المناسب</p>
            {errorMessage && (
              <div className="rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
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
                      ? "border-[#0B3D66] bg-[#E8F0F7] text-[#0B3D66]"
                      : "border-[#E5E7EB] bg-white text-[#1A1D21]"
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
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-xs font-semibold text-[#6B7280]">الموعد المختار</p>
              <p className="mt-1 text-base font-bold text-[#1A1D21]">{selectedSlot.label}</p>
              <div className="my-4 h-px bg-[#E5E7EB]" />
              <p className="text-xs font-semibold text-[#6B7280]">حالة التحقق</p>
              <p className="mt-1 text-base font-bold text-[#16794F]">تم التحقق بنجاح</p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF7F0] text-3xl text-[#16794F]">
              ✓
            </div>
            <p className="text-lg font-extrabold text-[#1A1D21]">
              تم تسجيل إقرارك السنوي بنجاح
            </p>
            <p className="max-w-xs text-[13px] font-medium text-[#6B7280]">
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
