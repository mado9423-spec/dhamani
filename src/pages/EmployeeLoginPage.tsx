import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { employeeLogin } from "../services/auth.service";

export default function EmployeeLoginPage() {
  const navigate = useNavigate();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!employeeNumber.trim()) {
      setError("يرجى إدخال رقم الموظف");
      return;
    }
    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setIsLoading(true);
    const result = await employeeLogin({ employeeNumber, password });
    setIsLoading(false);

    if (!result.success) {
      setError(result.message ?? "تعذر تسجيل الدخول");
      return;
    }

    navigate("/employee/dashboard");
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#1A1D21] px-6 font-cairo"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-[#1A1D21]">دخول الموظفين</h1>
          <p className="mt-1 text-sm text-[#6B7280]">ضماني — لوحة الموظف</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="employeeNumber"
            label="رقم الموظف"
            placeholder="أدخل رقم الموظف"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
          />

          <TextField
            id="password"
            label="كلمة المرور"
            type="password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="rounded-xl bg-[#FBEAE8] p-3 text-center text-[13px] font-semibold text-[#C0392B]">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={isLoading} className="mt-2">
            دخول
          </Button>
        </form>
      </div>
    </div>
  );
}
