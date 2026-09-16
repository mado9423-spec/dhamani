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
      dir="rtl"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F6F8FA] font-cairo transition-all duration-300 ${
        visible ? "opacity-100" : "pointer-events-none scale-105 opacity-0"
      }`}
    >
      <div className="animate-scale-in">
        <Logo size="lg" />
      </div>
      <p className="mt-5 animate-fade-in-up text-base font-bold text-[#17212B] [animation-delay:150ms]">
        تطبيق توثيق المعلومات
      </p>
      <p className="mt-1 animate-fade-in-up text-sm font-medium text-[#687581] [animation-delay:250ms]">
        صندوق الضمان الاجتماعي
      </p>
    </div>
  );
}
