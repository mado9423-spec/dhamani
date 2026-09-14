import { useNavigate } from "react-router-dom";
import { ServiceItem } from "../types/service";
import { Icon } from "./Icons";

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();

  if (service.featured) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className="group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-[20px] bg-primary p-5 text-right shadow-raised transition-all duration-200 hover:bg-primary-hover active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-200 group-hover:scale-105">
          <Icon name={service.icon} size={22} />
        </div>
        <div>
          <span className="block text-base font-bold text-white">
            {service.title}
          </span>
          <span className="mt-1 block text-sm font-medium text-white/70">
            {service.description}
          </span>
        </div>
        <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -right-4 h-20 w-20 rounded-full bg-accent/10" />
      </button>
    );
  }

  if (service.fullWidth) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-right shadow-card transition-colors duration-150 hover:border-primary/30 active:bg-line-soft"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
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
      className="flex min-h-[132px] flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-right shadow-card transition-colors duration-150 hover:border-primary/30 active:bg-line-soft"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
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
