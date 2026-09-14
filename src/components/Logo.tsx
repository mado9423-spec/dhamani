import logoSrc from "../assets/logo/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  decorative?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  sm: 40,
  md: 56,
  lg: 96,
};

export function Logo({ size = "md", className = "", decorative = false }: LogoProps) {
  const px = SIZE_MAP[size];
  return (
    <img
      src={logoSrc}
      alt={decorative ? "" : "شعار صندوق الضمان الاجتماعي"}
      width={px}
      height={px}
      style={{ width: px, height: px, objectFit: "contain" }}
      className={className}
      draggable={false}
    />
  );
}
