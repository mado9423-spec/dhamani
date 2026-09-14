import { useNavigate } from "react-router-dom";
import { ServiceItem } from "../types/service";

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();

  if (service.featured) {
    return (
      <button
        onClick={() => navigate(service.path)}
        className="flex w-full flex-col items-start gap-1 rounded-2xl bg-[#0B3D66] p-5 text-right transition-transform active:scale-[0.98]"
      >
        <span className="text-base font-bold text-white">{service.title}</span>
        <span className="text-sm font-medium text-white/70">
          {service.description}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(service.path)}
      className="flex flex-col items-start gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-right transition-colors active:bg-[#F5F6F7]"
    >
      <span className="text-sm font-semibold text-[#1A1D21]">
        {service.title}
      </span>
      <span className="text-[13px] font-medium text-[#6B7280]">
        {service.description}
      </span>
    </button>
  );
}
