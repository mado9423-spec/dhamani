import { useNavigate } from "react-router-dom";
import { ServiceItem } from "../types/service";

interface ServiceCardProps {
  service: ServiceItem;
}

export function
cat > 'src/components/LiveVerificationCamera.tsx' << 'DHAMANI_EOF'
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
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setState("requesting_permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("ready");
    } catch (err: any) {
      if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setState("no_camera");
      } else {
cat > 'src/components/ui/Button.tsx' << 'DHAMANI_EOF'
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  children,
  isLoading = false,
  variant = "primary",
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "h-12 w-full rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary:
      "bg-[#0B3D66] text-white hover:bg-[#092F4F] disabled:bg-gray-300 disabled:text-gray-500",
    secondary:
      "bg-white text-[#0B3D66] border border-[#0B3D66] hover:bg-[#E8F0F7]",
    ghost: "bg-transparent text-[#0B3D66] hover:bg-[#E8F0F7]",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <span
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden="true"
          />
          <span>جارٍ التحقق...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
