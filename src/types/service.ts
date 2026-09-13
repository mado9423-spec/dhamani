export interface CitizenProfile {
  id: string;
  fullName: string;
  pensionNumber: string;
  branchId: string;
  status: "active" | "suspended" | "archived";
}

export type ServiceId =
  | "annual_declaration"
  | "declaration_appointment"
  | "advance_appointment"
  | "new_pension_appointment"
  | "transactions"
  | "military_transactions"
  | "profile"
  | "notifications";

export interface ServiceItem {
  id: ServiceId;
  title: string;
  description: string;
  icon: string;
  path: string;
  featured?: boolean;
}
