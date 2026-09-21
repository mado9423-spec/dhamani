import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { citizenActivate, citizenLogin } from "../services/auth.service";
import { validatePensionNumber } from "../utils/validators";
import { Logo } from "../components/Logo";

type Mode = "login" | "activate";

interface FormErrors {
  pensionNumber?: string;
  activationCode?: string;
  pin?: string;
  confirmPin?: string;
}

const PIN_PATTERN = /^\d{6}$/;
const CODE_PATTERN = /^[A-Za-z0-9]{8}$/;

// Arabic keyboards type Arabic-Indic digits; the server expects Latin digits.
function toLatinDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function cleanPin(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "").slice(0, 6);
}

function normalizeCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export default function LoginPage() {
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [pensionNumber, setPensionNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setStatus("idle");
    setErrorMessage("");
    setActivationCode("");
    setPin("");
    setConfirmPin("");
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    const pensionError = validatePensionNumber(toLatinDigits(pensionNumber).trim());
    if (pensionError) nextErrors.pensionNumber = pensionError;

    if (mode === "activate" && !CODE_PATTERN.test(normalizeCode(activationCode))) {
      nextErrors.activationCode = "رمز التفعيل من 8 خانات، كما استلمته من الفرع";
    }

    if (!PIN_PATTERN.test(pin)) {
      nextErrors.pin = "الرقم السري يتكون من 6 أرقام";
    }

    if (mode === "activate" && pin !== confirmPin) {
      nextErrors.confirmPin = "الرقمان السريان غير متطابقين";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!isOnline) {
      return;
    }
    if (!validate()) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const pension = toLatinDigits(pensionNumber).trim();

    const result =
      mode === "activate"
        ? await citizenActivate({
            pensionNumber: pension,
            activationCode: normalizeCode(activationCode),
            pin,
          })
        : await citizenLogin({ pensionNumber: pension, pin });

    if (result.success) {
      setStatus("success");
      setTimeout(() => navigate("/home"), 900);
      return;
    }

    if (result.code === "weak_pin") {
      setErrors({ pin: result.message });
      setStatus("idle");
      return;
    }

    setErrorMessage(result.message ?? "تعذر تسجيل الدخول، تحقق من البيانات المدخلة");
    setStatus("error");
  }

  function goToEmployeeLogin() {
    navigate("/employee/login");
  }

  const isActivate = mode === "activate";

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[#F6F8FA] font-cairo"
    >
      {!isOnline && (
        <div className="bg-[#FBEAE8] px-5 py-2.5 text-center text-[13px] text-[#C0392B]">
          لا يوجد اتصال بالإنترنت
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-10 flex animate-fade-in-up flex-col items-center text-center">
          <Logo size="lg" className="mb-4" />
          <h1 className="text-2xl font-extrabold text-[#17212B]">ضماني</h1>
          <p className="mt-1 text-sm font-medium text-[#687581]">
            تطبيق توثيق المعلومات
          </p>
          <p className="text-sm font-medium text-[#687581]">
            صندوق الضمان الاجتماعي
          </p>
        </div>

        {status === "success" ? (
          <div className="animate-scale-in rounded-2xl bg-[#EAF7F0] p-6 text-center">
            <p className="text-base font-semibold text-[#16803C]">
              {isActivate ? "تم تفعيل حسابك بنجاح" : "تم تسجيل الدخول بنجاح"}
            </p>
            <p className="mt-1 text-sm text-[#16803C]/80">
              جارٍ تحويلك إلى الصفحة الرئيسية...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex animate-fade-in-up flex-col gap-4 [animation-delay:100ms]"
          >
            {isActivate && (
              <p className="rounded-xl bg-[#123F63]/5 p-3 text-center text-[13px] font-medium text-[#687581]">
                أدخل رمز التفعيل الذي استلمته من الفرع، ثم اختر رقمًا سريًا من 6 أرقام.
              </p>
            )}

            <TextField
              id="pensionNumber"
              label="رقم المعاش"
              placeholder="أدخل رقم المعاش"
              value={pensionNumber}
              onChange={(e) => setPensionNumber(e.target.value)}
              errorMessage={errors.pensionNumber}
              inputMode="numeric"
            />

            {isActivate && (
              <TextField
                id="activationCode"
                label="رمز التفعيل"
                placeholder="XXXX-XXXX"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                errorMessage={errors.activationCode}
                autoComplete="one-time-code"
                autoCapitalize="characters"
              />
            )}

            <TextField
              id="pin"
              type="password"
              label={isActivate ? "الرقم السري الجديد" : "الرقم السري"}
              placeholder="6 أرقام"
              value={pin}
              onChange={(e) => setPin(cleanPin(e.target.value))}
              errorMessage={errors.pin}
              inputMode="numeric"
              maxLength={6}
              autoComplete={isActivate ? "new-password" : "current-password"}
            />

            {isActivate && (
              <TextField
                id="confirmPin"
                type="password"
                label="تأكيد الرقم السري"
                placeholder="أعد إدخال الرقم السري"
                value={confirmPin}
                onChange={(e) => setConfirmPin(cleanPin(e.target.value))}
                errorMessage={errors.confirmPin}
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
              />
            )}

            {status === "error" && (
              <div className="animate-fade-in-up rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              isLoading={status === "loading"}
              disabled={!isOnline}
              className="mt-2"
            >
              {isActivate ? "تفعيل الحساب" : "دخول"}
            </Button>

            {!isActivate && (
              <p className="text-center text-[12px] font-medium text-[#687581]">
                إذا لم تفعّل حسابك بعد، راجع الفرع للحصول على رمز التفعيل.
              </p>
            )}
          </form>
        )}

        {status !== "success" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => switchMode(isActivate ? "login" : "activate")}
              className="text-center text-sm font-semibold text-[#123F63] hover:underline"
            >
              {isActivate ? "لدي حساب مفعّل، العودة للدخول" : "لدي رمز تفعيل من الفرع"}
            </button>
            <button
              type="button"
              onClick={goToEmployeeLogin}
              className="text-center text-sm font-semibold text-[#123F63] hover:underline"
            >
              تسجيل الدخول لموظف
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
