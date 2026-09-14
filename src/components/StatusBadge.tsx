export type TransactionStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "completed"
  | "suspended";

const STATUS_CONFIG: Record<TransactionStatus, { label: string; className: string }> = {
  pending_review: { label: "قيد المراجعة", className: "bg-accent-light text-accent" },
  accepted: { label: "مقبولة", className: "bg-primary-light text-primary" },
  rejected: { label: "مرفوضة", className: "bg-danger-light text-danger" },
  completed: { label: "مكتملة", className: "bg-success-light text-success" },
  suspended: { label: "معلقة", className: "bg-line-soft text-ink-soft" },
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
