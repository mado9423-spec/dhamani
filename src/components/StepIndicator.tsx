interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div dir="rtl" className="flex items-center gap-1 px-6 py-4">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              {index > 0 && (
                <div
                  className={`h-[2px] flex-1 ${
                    isCompleted || isCurrent ? "bg-[#123F63]" : "bg-[#E2E7EB]"
                  }`}
                />
              )}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isCompleted
                    ? "bg-[#123F63] text-white"
                    : isCurrent
                      ? "border-2 border-[#123F63] text-[#123F63]"
                      : "border-2 border-[#E2E7EB] text-[#9CA3AF]"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 ${
                    isCompleted ? "bg-[#123F63]" : "bg-[#E2E7EB]"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-center text-[10px] font-semibold leading-tight ${
                isCurrent ? "text-[#123F63]" : "text-[#9CA3AF]"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
