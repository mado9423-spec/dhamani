import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder: string;
  errorMessage?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, errorMessage, id, className = "", ...rest }, ref) => {
    const hasError = Boolean(errorMessage);

    return (
      <div className="w-full">
        <label
mkdir -p 'src/services'
cat > 'src/services/appointment.service.ts' << 'DHAMANI_EOF'
import { supabase } from "../lib/supabaseClient";
import { AppointmentSlot } from "./declaration.service";

export type AppointmentType =
  | "annual_declaration"
  | "advance_disbursement"
  | "new_pension_disbursement"
  | "general";

export interface AppointmentRecord {
  id: string;
  appointmentType: AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
}

export async function createAppointment(
  citizenId: string,
  branchId: string,
  appointmentType: AppointmentType,
  slot: AppointmentSlot
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      citizen_id: citizenId,
      branch_id: branchId,
      appointment_type: appointmentType,
      appointment_date: slot.date,
      appointment_time: slot.time,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id };
}

export async function listMyAppointments(): Promise<AppointmentRecord[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, appointment_type, appointment_date, appointment_time, status")
    .order("appointment_date", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    appointmentType: row.appointment_type,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    status: row.status,
  }));
}
