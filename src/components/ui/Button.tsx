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
    "h-12 w-full rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary:
      "bg-[#0B3D66] text-white hover:bg-[#092F4F] disabled:bg-gray-300 disabled:text-gray-500",
    secondary:
      "bg-white text-[#0B3D66] border border-[#0B3D66] hover:bg-[#E8F0F7]",
    ghost: "bg-transparent text-[#0B3D66] hover:bg-[#E8F0F7]",
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
