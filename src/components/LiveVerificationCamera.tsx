import { useEffect, useRef, useState } from "react";
import { verifyLiveImage } from "../services/verification.service";

type CameraState =
  | "requesting_permission"
  | "permission_denied"
  | "no_camera"
  | "ready"
  | "captured"
  | "verifying"
  | "verified"
  | "verification_failed";

interface LiveVerificationCameraProps {
  citizenId: string;
  onVerified: () => void;
}

export function LiveVerificationCamera({
  citizenId,
  onVerified,
}: LiveVerificationCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>("requesting_permission");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    requestCameraAccess();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // يربط البث بعنصر الفيديو فقط بعد أن يظهر فعلياً في الصفحة (state === "ready")
  useEffect(() => {
    if (state === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  async function requestCameraAccess() {
    setState("requesting_permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setState("ready");
    } catch (err: any) {
      if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setState("no_camera");
      } else {
        setState("permission_denied");
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    setState("captured");
    stopCamera();
  }

  async function handleConfirmCapture() {
    if (!capturedImage) return;
    setState("verifying");

    const result = await verifyLiveImage(capturedImage, citizenId);

    if (result.success) {
      setState("verified");
      setTimeout(onVerified, 500);
    } else {
      setState("verification_failed");
    }
  }

  function handleRetry() {
    setCapturedImage(null);
    requestCameraAccess();
  }

  return (
    <div dir="rtl" className="flex flex-col items-center gap-4">
      {state === "requesting_permission" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#0B3D66]" />
          <p className="text-sm font-semibold text-[#1A1D21]">
            يرجى السماح بالوصول إلى الكاميرا
          </p>
        </div>
      )}

      {state === "permission_denied" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FBEAE8] text-2xl">
            🚫
          </div>
          <p className="max-w-xs text-sm font-semibold text-[#C0392B]">
            لم يتم منح إذن الوصول إلى الكاميرا
          </p>
          <p className="max-w-xs text-[13px] font-medium text-[#6B7280]">
            يرجى تفعيل إذن الكاميرا من إعدادات المتصفح ثم إعادة المحاولة.
          </p>
          <button
            onClick={requestCameraAccess}
            className="mt-2 text-sm font-bold text-[#0B3D66]"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {state === "no_camera" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF3E1] text-2xl">
            📷
          </div>
          <p className="max-w-xs text-sm font-semibold text-[#B8860B]">
            تعذر العثور على كاميرا متاحة على هذا الجهاز
          </p>
          <p className="max-w-xs text-[13px] font-medium text-[#6B7280]">
            يرجى استخدام جهاز به كاميرا لإكمال التحقق.
          </p>
        </div>
      )}

      {state === "ready" && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-white/70" />
          </div>
          <p className="max-w-xs text-center text-[13px] font-medium text-[#6B7280]">
            ضع وجهك داخل الإطار الدائري بوضوح ثم اضغط "التقاط الصورة"
          </p>
          <button
            onClick={handleCapture}
            className="h-12 w-full max-w-xs rounded-xl bg-[#0B3D66] text-base font-bold text-white transition-transform active:scale-[0.98]"
          >
            التقاط الصورة
          </button>
        </div>
      )}

      {state === "captured" && capturedImage && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="aspect-square w-full max-w-xs overflow-hidden rounded-2xl">
            <img src={capturedImage} alt="الصورة الملتقطة" className="h-full w-full scale-x-[-1] object-cover" />
          </div>
          <div className="flex w-full max-w-xs gap-3">
            <button
              onClick={handleRetry}
              className="h-12 flex-1 rounded-xl border border-[#E5E7EB] text-sm font-bold text-[#1A1D21]"
            >
              إعادة الالتقاط
            </button>
            <button
              onClick={handleConfirmCapture}
              className="h-12 flex-1 rounded-xl bg-[#0B3D66] text-sm font-bold text-white"
            >
              تأكيد واستمرار
            </button>
          </div>
        </div>
      )}

      {state === "verifying" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E5E7EB] border-t-[#0B3D66]" />
          <p className="text-sm font-semibold text-[#1A1D21]">
            جارٍ التحقق من الهوية...
          </p>
          <p className="text-[13px] font-medium text-[#6B7280]">
            قد يستغرق هذا بضع ثوانٍ
          </p>
        </div>
      )}

      {state === "verified" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF7F0] text-3xl text-[#16794F]">
            ✓
          </div>
          <p className="text-sm font-bold text-[#16794F]">تم التحقق من هويتك بنجاح</p>
        </div>
      )}

      {state === "verification_failed" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FBEAE8] text-2xl">
            ✕
          </div>
          <p className="max-w-xs text-sm font-semibold text-[#C0392B]">
            تعذر التحقق من هويتك، يرجى المحاولة مرة أخرى
          </p>
          <button
            onClick={handleRetry}
            className="mt-2 h-12 w-full max-w-xs rounded-xl bg-[#0B3D66] text-sm font-bold text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
