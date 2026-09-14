import { InputHTMLAttributes, forwardRef } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, errorMessage, id, className = "", ...rest }, ref) => {
    const hasError = Boolean(errorMessage);

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-semibold text-[#17212B]"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          dir="rtl"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border px-4 text-[15px] font-medium text-[#17212B] outline-none transition-colors placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-[#123F63]/20 ${
            hasError
              ? "border-[#C0392B] focus:border-[#C0392B]"
              : "border-[#E2E7EB] focus:border-[#123F63]"
          } ${className}`}
          {...rest}
        />
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

TextField.displayName = "TextField";
