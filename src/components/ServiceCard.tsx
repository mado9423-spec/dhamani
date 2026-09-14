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
        className="relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl bg-[#0B3D66] p-5 text-right transition-transform active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
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
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      </button>
    );
  }

  if (service.fullWidth) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className="flex w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-right transition-colors active:bg-[#F5F6F7]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B3D66]/8 text-[#0B3D66]">
          <Icon name={service.icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#1A1D21]">
            {service.title}
          </span>
          <span className="block truncate text-[13px] font-medium text-[#6B7280]">
            {service.description}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(service.path)}
      className="flex min-h-[132px] flex-col items-start justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-right transition-colors active:bg-[#F5F6F7]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3D66]/8 text-[#0B3D66]">
        <Icon name={service.icon} size={18} />
      </div>
      <div className="w-full">
        <span className="block text-sm font-semibold leading-snug text-[#1A1D21]">
          {service.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-[12px] font-medium leading-snug text-[#6B7280]">
          {service.description}
        </span>
      </div>
    </button>
  );
}
