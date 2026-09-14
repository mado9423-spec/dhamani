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
          htmlFor={id}
          className="mb-1.5 block text-sm font-semibold text-[#17212B]"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={id}
          dir="rtl"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          defaultValue=""
          className={`h-12 w-full rounded-xl border bg-white px-4 text-[15px] font-medium text-[#17212B] outline-none transition-colors focus:ring-2 focus:ring-[#123F63]/20 ${
            hasError
              ? "border-[#C0392B] focus:border-[#C0392B]"
              : "border-[#E2E7EB] focus:border-[#123F63]"
          } ${className}`}
          {...rest}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasError && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-[13px] text-[#C0392B]"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
