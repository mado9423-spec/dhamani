import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { Select } from "../components/ui/Select";
import { BRANCHES } from "../types/branch";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { citizenLogin } from "../services/auth.service";
import { validateFullName, validatePensionNumber, validateBranch } from "../utils/validators";
import { Logo } from "../components/Logo";
import { PageShell } from "../components/PageShell";

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
    <PageShell>
      {!isOnline && (
        <div className="bg-danger-light px-5 py-2.5 text-center text-[13px] font-medium text-danger">
          لا يوجد اتصال بالإنترنت
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-10 flex animate-rise-in flex-col items-center text-center">
          <Logo size="lg" className="mb-4" />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">ضماني</h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            تطبيق توثيق المعلومات
          </p>
          <p className="text-sm font-medium text-ink-soft">
            صندوق الضمان الاجتماعي
          </p>
        </div>

        {status === "success" ? (
          <div className="animate-scale-in rounded-2xl bg-success-light p-6 text-center">
            <p className="text-base font-semibold text-success">
              تم تسجيل الدخول بنجاح
            </p>
            <p className="mt-1 text-sm text-success/80">
              جارٍ تحويلك إلى الصفحة الرئيسية...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex animate-rise-in flex-col gap-4"
            style={{ animationDelay: "80ms" }}
          >
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
              className="tabular-nums"
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
              <div className="rounded-xl bg-danger-light p-3 text-center text-[13px] font-semibold text-danger">
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
            className="mt-6 text-center text-sm font-semibold text-primary hover:underline"
          >
            تسجيل الدخول لموظف
          </button>
        )}
      </div>
    </PageShell>
  );
}
