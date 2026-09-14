import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  children,
  isLoading = false,
  variant = "primary",
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "h-12 w-full rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:translate-y-0";

  const variants: Record<string, string> = {
    primary:
      "bg-primary text-white shadow-card hover:bg-primary-hover disabled:bg-line disabled:text-ink-faint disabled:shadow-none",
    secondary:
      "bg-white text-primary border border-primary/25 hover:border-primary hover:bg-primary-light",
    ghost: "bg-transparent text-primary hover:bg-primary-light",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <span
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden="true"
          />
          <span>جارٍ التحقق...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
