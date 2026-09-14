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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F6F8FA] font-cairo transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <Logo size="lg" />
      <p className="mt-5 text-base font-bold text-[#17212B]">
        تطبيق توثيق المعلومات
      </p>
      <p className="mt-1 text-sm font-medium text-[#687581]">
        صندوق الضمان الاجتماعي
      </p>
    </div>
  );
}
