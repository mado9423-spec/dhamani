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
          className="mb-1.5 block text-sm font-semibold text-ink"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          dir="rtl"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-surface px-4 text-[15px] font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-ink-faint focus:ring-2 focus:ring-primary/20 ${
            hasError
              ? "border-danger focus:border-danger"
              : "border-line focus:border-primary"
          } ${className}`}
          {...rest}
        />
        {hasError && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-[13px] text-danger"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
