import { supabase } from "../lib/supabaseClient";
import { CitizenProfile } from "../types/service";

export async function getCurrentCitizen(): Promise<CitizenProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("citizens")
    .select("id, full_name, pension_number, branch_id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    pensionNumber: data.pension_number,
    branchId: data.branch_id,
    status: data.status,
  };
}
cat > 'src/services/declaration.service.ts' << 'DHAMANI_EOF'
import { supabase } from "../lib/supabaseClient";

export interface AppointmentSlot {
  date: string;
  time: string;
  label: string;
}

const ARABIC_DAYS = [
  "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function generateAvailableSlots(): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  const times = ["09:00", "10:00", "11:00", "12:00", "13:00"];
  const today = new Date();
  let daysAdded = 0;
  let offset = 1;

  while (daysAdded < 6) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    offset += 1;

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) continue;

    const dateStr = date.toISOString().split("T")[0];
    const dayLabel = ARABIC_DAYS[dayOfWeek];
    const monthLabel = ARABIC_MONTHS[date.getMonth()];

    times.forEach((time) => {
      const hour = parseInt(time.split(":")[0], 10);
      const period = hour < 12 ? "ص" : "م";
      const hour12 = hour > 12 ? hour - 12 : hour;

      slots.push({
        date: dateStr,
        time,
        label: `${dayLabel}، ${date.getDate()} ${monthLabel} — ${hour12}:00 ${period}`,
      });
    });

    daysAdded += 1;
  }

  return slots;
}

export async function createDeclarationAppointment(
  citizenId: string,
  branchId: string,
  slot: AppointmentSlot
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      citizen_id: citizenId,
      branch_id: branchId,
      appointment_type: "annual_declaration",
      appointment_date: slot.date,
      appointment_time: slot.time,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id };
}

export async function submitAnnualDeclaration(
  citizenId: string,
  branchId: string,
  appointmentId: string
): Promise<{ success: boolean; message?: string }> {
  const currentYear = new Date().getFullYear();

  const { error } = await supabase.from("annual_declarations").insert({
    citizen_id: citizenId,
    branch_id: branchId,
    declaration_year: currentYear,
    appointment_id: appointmentId,
    verification_status: "verified",
    verification_method: "live_image",
    status: "completed",
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        message: "لقد قدّمت الإقرار السنوي لهذا العام مسبقاً",
      };
    }
    return { success: false, message: "تعذر إرسال الإقرار، يرجى المحاولة لاحقاً" };
  }

  return { success: true };
}
