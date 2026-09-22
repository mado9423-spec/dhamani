import { useNavigate } from "react-router-dom";
import { ServiceAccent, ServiceItem } from "../types/service";
import { Icon } from "./Icons";

interface ServiceCardProps {
  service: ServiceItem;
}

const ACCENT_STYLES: Record<
  ServiceAccent,
  { badge: string; hover: string; active: string }
> = {
  violet: {
    badge: "bg-violet-light text-violet",
    hover: "hover:border-violet/30",
    active: "active:bg-violet-light/50",
  },
  teal: {
    badge: "bg-teal-light text-teal",
    hover: "hover:border-teal/30",
    active: "active:bg-teal-light/50",
  },
  rose: {
    badge: "bg-rose-light text-rose",
    hover: "hover:border-rose/30",
    active: "active:bg-rose-light/50",
  },
  cyan: {
    badge: "bg-cyan-light text-cyan",
    hover: "hover:border-cyan/30",
    active: "active:bg-cyan-light/50",
  },
  accent: {
    badge: "bg-accent-light text-accent",
    hover: "hover:border-accent/30",
    active: "active:bg-accent-light/50",
  },
  success: {
    badge: "bg-success-light text-success",
    hover: "hover:border-success/30",
    active: "active:bg-success-light/50",
  },
};

const DEFAULT_STYLE = {
  badge: "bg-primary-light text-primary",
  hover: "hover:border-primary/30",
  active: "active:bg-line-soft",
};

export function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();
  const accent = service.accent ? ACCENT_STYLES[service.accent] : DEFAULT_STYLE;

  if (service.featured) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className="group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-primary via-primary to-primary-bright p-5 text-right shadow-raised transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
          <Icon name={service.icon} size={22} />
        </div>
        <div>
          <span className="block text-base font-bold text-white">
            {service.title}
          </span>
          <span className="mt-1 block text-sm font-medium text-white/75">
            {service.description}
          </span>
        </div>
        <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-md" />
        <div className="pointer-events-none absolute -bottom-10 -right-4 h-24 w-24 rounded-full bg-accent/25 blur-md" />
      </button>
    );
  }

  if (service.fullWidth) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className={`flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-right shadow-card transition-colors duration-150 ${accent.hover} ${accent.active}`}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.badge}`}>
          <Icon name={service.icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {service.title}
          </span>
          <span className="block truncate text-[13px] font-medium text-ink-soft">
            {service.description}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(service.path)}
      className={`flex min-h-[132px] flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-right shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-raised ${accent.hover} ${accent.active}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${accent.badge}`}>
        <Icon name={service.icon} size={18} />
      </div>
      <div className="w-full">
        <span className="block text-sm font-semibold leading-snug text-ink">
          {service.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-[12px] font-medium leading-snug text-ink-soft">
          {service.description}
        </span>
      </div>
    </button>
  );
}
