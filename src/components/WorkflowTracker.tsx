import { StatusBadge, TransactionStatus } from "./StatusBadge";

const LINEAR_STAGES: { key: TransactionStatus; label: string }[] = [
  { key: "pending_review", label: "قيد المراجعة" },
  { key: "accepted", label: "مقبولة" },
  { key: "completed", label: "مكتملة" },
];

interface WorkflowTrackerProps {
  status: TransactionStatus;
}

/**
 * تتبع مرئي لمسار المعاملة عبر مراحلها الخطية. rejected/suspended حالتا
 * استثناء خارج المسار الخطي فتُعرضان كشارة بدلاً من التقدم المرحلي.
 */
export function WorkflowTracker({ status }: WorkflowTrackerProps) {
  const isException = status === "rejected" || status === "suspended";

  if (isException) {
    return (
      <div dir="rtl" className="flex items-center gap-2">
        <StatusBadge status={status} />
      </div>
    );
  }

  const currentIndex = LINEAR_STAGES.findIndex((stage) => stage.key === status);

  return (
    <div dir="rtl" className="flex items-center gap-2">
      {LINEAR_STAGES.map((stage, i) => {
        const isDone = i <= currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={stage.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full ${isDone ? "bg-[#123F63]" : "bg-[#E2E7EB]"}`}
            />
            <span
              className={`text-[10px] font-bold ${
                isActive ? "text-[#123F63]" : isDone ? "text-[#687581]" : "text-[#9CA3AF]"
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
