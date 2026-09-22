import { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hideTimer = setTimeout(() => setVisible(false), 1100);
    const finishTimer = setTimeout(onFinish, 1400);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-backdrop transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        dir="rtl"
        className="relative flex w-full max-w-[480px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-bright font-cairo md:border-x md:border-black/[0.04] md:shadow-shell"
      >
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative animate-scale-in">
          <Logo size="lg" />
        </div>
        <p className="relative mt-5 animate-rise-in text-base font-bold text-white" style={{ animationDelay: "150ms" }}>
          تطبيق توثيق المعلومات
        </p>
        <p className="relative mt-1 animate-rise-in text-sm font-medium text-white/70" style={{ animationDelay: "220ms" }}>
          صندوق الضمان الاجتماعي
        </p>
        <div
          className="relative mt-6 h-[3px] w-10 animate-rise-in rounded-full bg-accent"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
