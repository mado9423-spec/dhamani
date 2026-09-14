import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { getCurrentCitizen } from "../services/citizen.service";
import { CitizenProfile } from "../types/service";
import { generateAvailableSlots, AppointmentSlot } from "../services/declaration.service";
import { createAppointment, AppointmentType } from "../services/appointment.service";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";

type UrlType = "advance" | "new-pension" | "declaration";

const TYPE_CONFIG: Record<
  UrlType,
  { dbType: AppointmentType; title: string; successMessage: string }
> = {
  advance: {
    dbType: "advance_disbursement",
    title: "موعد صرف السلفة",
    successMessage: "تم حجز موعد صرف السلفة بنجاح",
  },
  "new-pension": {
    dbType: "new_pension_disbursement",
    title: "موعد صرف المعاش الجديد",
    successMessage: "تم حجز موعد صرف المعاش الجديد بنجاح",
  },
  declaration: {
    dbType: "annual_declaration",
    title: "تحديد موعد الإقرار",
    successMessage: "تم حجز موعد الإقرار السنوي بنجاح",
  },
};

export default function AppointmentBookingPage() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: UrlType }>();
  const config = type ? TYPE_CONFIG[type] : undefined;

  const [citizen, setCitizen] = useState<CitizenProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slots] = useState<AppointmentSlot[]>(generateAvailableSlots());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getCurrentCitizen().then((data) => {
      setCitizen(data);
      setIsLoading(false);
    });
  }, []);

  async function handleConfirm() {
    if (!citizen || !selectedSlot || !config) return;
    setIsBooking(true);
    setErrorMessage("");

    const result = await createAppointment(
      citizen.id,
      citizen.branchId,
      config.dbType,
      selectedSlot
    );

    setIsBooking(false);

    if (!result) {
      setErrorMessage("تعذر حجز الموعد، يرجى المحاولة مجدداً");
      return;
    }

    setIsDone(true);
  }

  if (!config) {
    return (
      <PageShell className="items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-danger">نوع موعد غير معروف</p>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell className="items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title={config.title} />

      <main className="px-6 py-6">
        {isDone ? (
          <div className="flex flex-col items-center gap-3 pt-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-3xl text-success">
              ✓
            </div>
            <p className="text-lg font-extrabold text-ink">
              {config.successMessage}
            </p>
            {selectedSlot && (
              <p className="text-sm font-semibold text-ink-soft">
                {selectedSlot.label}
              </p>
            )}
            <Button onClick={() => navigate("/home")} className="mt-4">
              العودة للرئيسية
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
                  onClick={() => setSelectedSlot(slot)}
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

            <Button
              onClick={handleConfirm}
              isLoading={isBooking}
              disabled={!selectedSlot}
              className="mt-2"
            >
              تأكيد الحجز
            </Button>
          </div>
        )}
      </main>
    </PageShell>
  );
}
