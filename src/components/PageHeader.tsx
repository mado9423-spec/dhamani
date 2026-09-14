import { useNavigate } from "react-router-dom";
import { Icon } from "./Icons";

interface PageHeaderProps {
  title: string;
  /** Dark variant for staff/admin screens, to match their navy surface. */
  tone?: "light" | "dark";
}

export function PageHeader({ title, tone = "light" }: PageHeaderProps) {
  const navigate = useNavigate();
  const isDark = tone === "dark";

  return (
    <header
      className={`flex items-center gap-3 px-5 py-4 ${
        isDark ? "bg-primary-dark" : "border-b border-line bg-surface"
      }`}
    >
      <button
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className={`-m-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          isDark ? "text-white hover:bg-white/10" : "text-ink hover:bg-line-soft"
        }`}
      >
        <Icon name="chevron-back" size={22} />
      </button>
      <h1 className={`text-[15px] font-bold ${isDark ? "text-white" : "text-ink"}`}>
        {title}
      </h1>
    </header>
  );
}
