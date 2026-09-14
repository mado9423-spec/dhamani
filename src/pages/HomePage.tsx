import { useEffect, useState } from "react";
import { getCurrentCitizen } from "../services/citizen.service";
import { CitizenProfile, ServiceItem } from "../types/service";
import { ServiceCard } from "../components/ServiceCard";
import { BottomNav } from "../components/BottomNav";
import { Logo } from "../components/Logo";

const services: ServiceItem[] = [
  {
    id: "annual_declaration",
    title: "الإقرار السنوي",
    description: "أكمل إقرارك السنوي خلال دقائق",
    icon: "file-check",
    path: "/declaration",
    featured: true,
  },
  {
    id: "notifications",
    title: "الإشعارات",
    description: "آخر التحديثات على حسابك",
    icon: "bell",
    path: "/notifications",
    fullWidth: true,
  },
  {
    id: "transactions",
    title: "متابعة المعاملات",
    description: "تتبع حالة معاملاتك",
    icon: "list-check",
    path: "/transactions",
  },
  {
    id: "declaration_appointment",
    title: "تحديد موعد الإقرار",
    description: "احجز موعداً بالفرع",
    icon: "calendar",
    path: "/appointments/declaration",
  },
  {
    id: "advance_appointment",
    title: "موعد صرف السلفة",
    description: "حجز موعد استلام السلفة",
    icon: "cash",
    path: "/appointments/advance",
  },
  {
    id: "new_pension_appointment",
    title: "موعد صرف المعاش الجديد",
    description: "حجز موعد أول صرف",
    icon: "calendar-plus",
    path: "/appointments/new-pension",
  },
  {
    id: "profile",
    title: "الملف الشخصي",
    description: "بياناتك الشخصية",
    icon: "user",
    path: "/profile",
  },
  {
    id: "military_transactions",
    title: "معاملات التقاعد العسكري",
    description: "خدمات المتقاعدين العسكريين",
    icon: "shield-check",
    path: "/transactions/military",
  },
];

export default function HomePage() {
  const [citizen, setCitizen] = useState<CitizenProfile | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentCitizen().then((data) => {
      setCitizen(data);
      setIsLoading(false);
    });

    const timer = setTimeout(() => setShowGreeting(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const featuredService = services.find((s) => s.featured);
  const fullWidthService = services.find((s) => s.fullWidth);
  const gridServices = services.filter((s) => !s.featured && !s.fullWidth);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F3F5F8] pb-24 font-cairo">
      <header className="bg-[#F6F8FA] px-6 pb-5 pt-8 shadow-[0_1px_0_0_#E2E7EB]">
        <div className="mb-4 flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-sm font-bold text-[#123F63]">
            صندوق الضمان الاجتماعي
          </span>
        </div>

        <p
          className={`text-sm font-medium text-[#687581] transition-opacity duration-500 ${
            showGreeting ? "opacity-100" : "h-0 opacity-0"
          }`}
        >
          مرحباً بك
        </p>

        {isLoading ? (
          <div className="mt-1 h-7 w-40 animate-pulse rounded-md bg-[#E2E7EB]" />
        ) : (
          <>
            <h1 className="mt-1 text-xl font-extrabold text-[#17212B]">
              {citizen?.fullName ?? "مواطن"}
            </h1>
            <div className="mt-2 h-[3px] w-10 rounded-full bg-[#B8860B]" />
          </>
        )}
      </header>

      <main className="flex flex-col gap-3 px-6 pt-5">
        {featuredService && <ServiceCard service={featuredService} />}
        {fullWidthService && <ServiceCard service={fullWidthService} />}

        <div className="mt-1 grid grid-cols-2 gap-3">
          {gridServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
