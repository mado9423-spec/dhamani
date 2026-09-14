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
        className="flex w-full max-w-[480px] flex-col items-center justify-center bg-page font-cairo md:border-x md:border-black/[0.04] md:shadow-shell"
      >
        <Logo size="lg" />
        <p className="mt-5 text-base font-bold text-ink">تطبيق توثيق المعلومات</p>
        <p className="mt-1 text-sm font-medium text-ink-soft">صندوق الضمان الاجتماعي</p>
        <div className="mt-6 h-[3px] w-10 rounded-full bg-accent" />
      </div>
    </div>
  );
}
