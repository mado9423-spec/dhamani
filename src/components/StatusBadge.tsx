export type TransactionStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "completed"
  | "suspended";

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; bg: string; text: string }
> = {
  pending_review: { label: "قيد المراجعة", bg: "#FBF3E1", text: "#B8860B" },
  accepted: { label: "مقبولة", bg: "#E8F0F7", text: "#0B3D66" },
  rejected: { label: "مرفوضة", bg: "#FBEAE8", text: "#C0392B" },
  completed: { label: "مكتملة", bg: "#EAF7F0", text: "#16794F" },
  suspended: { label: "معلقة", bg: "#F3F4F6", text: "#6B7280" },
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
