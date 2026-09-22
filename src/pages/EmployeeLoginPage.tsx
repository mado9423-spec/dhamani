import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { employeeLogin } from "../services/auth.service";
import { PageShell } from "../components/PageShell";

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
    <PageShell
      bg="bg-gradient-to-br from-primary-dark via-primary to-primary-bright"
      className="items-center justify-center px-6"
    >
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-ink">دخول الموظفين</h1>
          <p className="mt-1 text-sm text-ink-soft">ضماني — لوحة الموظف</p>
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
            <div className="animate-fade-in-up rounded-xl bg-danger-light p-3 text-center text-[13px] font-semibold text-danger">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={isLoading} className="mt-2">
            دخول
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
