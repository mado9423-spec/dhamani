import { useEffect, useState } from "react";
import { getCurrentCitizen } from "../services/citizen.service";
import { CitizenProfile, ServiceItem } from "../types/service";
import { ServiceCard } from "../components/ServiceCard";
import { BottomNav } from "../components/BottomNav";

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
    id: "transactions",
    title: "متابعة المعاملات",
    description: "تتبع حالة معاملاتك",
    icon: "list-check",
    path: "/transactions",
  },
  {
    id: "military_transactions",
    title: "معاملات التقاعد العسكري",
    description: "خدمات خاصة بالمتقاعدين العسكريين",
    icon: "shield",
    path: "/transactions/military",
  },
  {
    id: "profile",
    title: "الملف الشخصي",
    description: "بياناتك الشخصية",
    icon: "user",
    path: "/profile",
  },
  {
    id: "notifications",
    title: "الإشعارات",
    description: "آخر التحديثات على حسابك",
    icon: "bell",
    path: "/notifications",
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
  const otherServices = services.filter((s) => !s.featured);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFBFC] pb-24 font-cairo">
      <header className="px-6 pt-8 pb-4">
        <p
          className={`text-sm font-medium text-[#6B7280] transition-opacity duration-500 ${
            showGreeting ? "opacity-100" : "h-0 opacity-0"
          }`}
        >
          مرحباً بك
        </p>

        {isLoading ? (
          <div className="mt-1 h-7 w-40 animate-pulse rounded-md bg-[#E5E7EB]" />
        ) : (
          <h1 className="mt-1 text-xl font-extrabold text-[#1A1D21]">
            {citizen?.fullName ?? "مواطن"}
          </h1>
        )}
      </header>

      <main className="flex flex-col gap-3 px-6">
        {featuredService && <ServiceCard service={featuredService} />}

        <div className="mt-1 grid grid-cols-2 gap-3">
          {otherServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
