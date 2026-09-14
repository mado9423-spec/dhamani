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
                  className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                    isCompleted || isCurrent
                      ? "bg-gradient-to-l from-primary to-primary-bright"
                      : "bg-line"
                  }`}
                />
              )}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-gradient-to-br from-primary to-primary-bright text-white shadow-card"
                    : isCurrent
                      ? "scale-110 border-2 border-primary text-primary shadow-card"
                      : "border-2 border-line text-ink-faint"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                    isCompleted
                      ? "bg-gradient-to-l from-primary to-primary-bright"
                      : "bg-line"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-center text-[10px] font-semibold leading-tight ${
                isCurrent ? "text-primary" : "text-ink-faint"
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
