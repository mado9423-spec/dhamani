import { useEffect, useState } from "react";
import { getCurrentCitizen } from "../services/citizen.service";
import { CitizenProfile, ServiceItem } from "../types/service";
import { ServiceCard } from "../components/ServiceCard";
import { BottomNav } from "../components/BottomNav";
import { Logo } from "../components/Logo";
import { PageShell } from "../components/PageShell";

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
    accent: "teal",
  },
  {
    id: "declaration_appointment",
    title: "تحديد موعد الإقرار",
    description: "احجز موعداً بالفرع",
    icon: "calendar",
    path: "/appointments/declaration",
    accent: "violet",
  },
  {
    id: "advance_appointment",
    title: "موعد صرف السلفة",
    description: "حجز موعد استلام السلفة",
    icon: "cash",
    path: "/appointments/advance",
    accent: "success",
  },
  {
    id: "new_pension_appointment",
    title: "موعد صرف المعاش الجديد",
    description: "حجز موعد أول صرف",
    icon: "calendar-plus",
    path: "/appointments/new-pension",
    accent: "rose",
  },
  {
    id: "profile",
    title: "الملف الشخصي",
    description: "بياناتك الشخصية",
    icon: "user",
    path: "/profile",
    accent: "cyan",
  },
  {
    id: "military_transactions",
    title: "معاملات التقاعد العسكري",
    description: "خدمات المتقاعدين العسكريين",
    icon: "shield-check",
    path: "/transactions/military",
    accent: "accent",
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
    <PageShell className="pb-24">
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-bright px-6 pb-7 pt-8">
        <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-accent/20 blur-xl" />

        <div className="relative mb-5 flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-sm font-bold text-white">
            صندوق الضمان الاجتماعي
          </span>
        </div>

        <p
          className={`relative text-sm font-medium text-white/70 transition-opacity duration-500 ${
            showGreeting ? "opacity-100" : "h-0 opacity-0"
          }`}
        >
          مرحباً بك
        </p>

        {isLoading ? (
          <div className="relative mt-1 h-7 w-40 animate-pulse rounded-md bg-white/15" />
        ) : (
          <>
            <h1 className="relative mt-1 text-xl font-extrabold tracking-tight text-white">
              {citizen?.fullName ?? "مواطن"}
            </h1>
            <div className="relative mt-2 h-[3px] w-10 rounded-full bg-accent" />
          </>
        )}
      </header>

      <main className="flex flex-col gap-3 px-6 pt-6">
        {featuredService && (
          <div className="animate-rise-in" style={{ animationDelay: "50ms" }}>
            <ServiceCard service={featuredService} />
          </div>
        )}
        {fullWidthService && (
          <div className="animate-rise-in" style={{ animationDelay: "100ms" }}>
            <ServiceCard service={fullWidthService} />
          </div>
        )}

        <div className="mt-1 grid grid-cols-2 gap-3">
          {gridServices.map((service, index) => (
            <div
              key={service.id}
              className="animate-rise-in"
              style={{ animationDelay: `${150 + index * 60}ms` }}
            >
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </PageShell>
  );
}
