import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { Select } from "../components/ui/Select";
import { BRANCHES } from "../types/branch";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { citizenLogin } from "../services/auth.service";
import { validateFullName, validatePensionNumber, validateBranch } from "../utils/validators";

interface FormErrors {
  fullName?: string;
  pensionNumber?: string;
  branch?: string;
}

export default function LoginPage() {
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [pensionNumber, setPensionNumber] = useState("");
  const [branch, setBranch] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    const nameError = validateFullName(fullName);
    if (nameError) nextErrors.fullName = nameError;

    const pensionError = validatePensionNumber(pensionNumber);
    if (pensionError) nextErrors.pensionNumber = pensionError;

    const branchError = validateBranch(branch);
    if (branchError) nextErrors.branch = branchError;

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

    const result = await citizenLogin({
      fullName,
      pensionNumber,
      branchCode: branch,
    });

    if (result.success) {
      setStatus("success");
      setTimeout(() => navigate("/home"), 900);
    } else {
      setErrorMessage(result.message ?? "تعذر تسجيل الدخول، تحقق من البيانات المدخلة");
      setStatus("error");
    }
  }

  function goToEmployeeLogin() {
    navigate("/employee/login");
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[#FAFBFC] font-cairo"
    >
      {!isOnline && (
        <div className="bg-[#FBEAE8] px-5 py-2.5 text-center text-[13px] text-[#C0392B]">
          لا يوجد اتصال بالإنترنت
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B3D66]">
            <span className="text-2xl font-bold text-white">ض</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1D21]">ضماني</h1>
          <p className="mt-1 text-sm font-medium text-[#6B7280]">
            صندوق الضمان الاجتماعي
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-2xl bg-[#EAF7F0] p-6 text-center">
            <p className="text-base font-semibold text-[#16794F]">
              تم تسجيل الدخول بنجاح
            </p>
            <p className="mt-1 text-sm text-[#16794F]/80">
              جارٍ تحويلك إلى الصفحة الرئيسية...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              id="fullName"
              label="الاسم الرباعي"
              placeholder="أدخل الاسم الرباعي"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              errorMessage={errors.fullName}
              autoComplete="name"
            />

            <TextField
              id="pensionNumber"
              label="رقم المعاش"
              placeholder="أدخل رقم المعاش"
              value={pensionNumber}
              onChange={(e) => setPensionNumber(e.target.value)}
              errorMessage={errors.pensionNumber}
              inputMode="numeric"
            />

            <Select
              id="branch"
              label="الفرع"
              placeholder="اختر الفرع"
              options={BRANCHES}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              errorMessage={errors.branch}
            />

            {status === "error" && (
              <div className="rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              isLoading={status === "loading"}
              disabled={!isOnline}
              className="mt-2"
            >
              دخول
            </Button>
          </form>
        )}

        {status !== "success" && (
          <button
            type="button"
            onClick={goToEmployeeLogin}
            className="mt-6 text-center text-sm font-semibold text-[#0B3D66] hover:underline"
          >
            تسجيل الدخول لموظف
          </button>
        )}
      </div>
    </div>
  );
}
