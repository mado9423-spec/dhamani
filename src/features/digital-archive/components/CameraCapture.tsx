import { useEffect, useRef, useState } from "react";

type CameraState =
  | "requesting_permission"
  | "permission_denied"
  | "no_camera"
  | "ready"
  | "captured";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>("requesting_permission");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  useEffect(() => {
    requestCameraAccess();
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
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
        video: { facingMode: "environment", width: 1920, height: 1080 },
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
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `document-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        setState("captured");
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetry() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    requestCameraAccess();
  }

  function handleConfirm() {
    if (capturedFile) onCapture(capturedFile);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {state === "requesting_permission" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
          <p className="text-sm font-semibold text-[#17212B]">
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
          <p className="max-w-xs text-[13px] font-medium text-[#687581]">
            يرجى تفعيل إذن الكاميرا من إعدادات المتصفح ثم إعادة المحاولة، أو استخدام السحب
            والإفلات بدلاً من ذلك.
          </p>
          <button
            onClick={requestCameraAccess}
            className="mt-2 text-sm font-bold text-[#123F63]"
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
        </div>
      )}

      {state === "ready" && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-white/70" />
          </div>
          <p className="text-center text-[13px] font-medium text-[#687581]">
            ضع المستند داخل الإطار بوضوح تام ثم اضغط "التقاط"
          </p>
          <button
            onClick={handleCapture}
            className="h-12 w-full rounded-xl bg-[#123F63] text-base font-bold text-white transition-transform active:scale-[0.98]"
          >
            التقاط الصورة
          </button>
        </div>
      )}

      {state === "captured" && previewUrl && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E2E7EB]">
            <img
              src={previewUrl}
              alt="المستند الملتقط"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex w-full gap-3">
            <button
              onClick={handleRetry}
              className="h-12 flex-1 rounded-xl border border-[#E2E7EB] text-sm font-bold text-[#17212B]"
            >
              إعادة الالتقاط
            </button>
            <button
              onClick={handleConfirm}
              className="h-12 flex-1 rounded-xl bg-[#123F63] text-sm font-bold text-white"
            >
              استخدام هذه الصورة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
