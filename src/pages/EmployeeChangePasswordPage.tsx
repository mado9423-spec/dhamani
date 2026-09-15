import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { changeEmployeePassword } from "../services/auth.service";
import { getCurrentEmployee, EmployeeProfile } from "../services/employee.service";

const MIN_PASSWORD_LENGTH = 8;

export default function EmployeeChangePasswordPage() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    getCurrentEmployee().then((data) => {
      if (!data) {
        navigate("/employee/login");
        return;
      }
      setEmployee(data);
      setIsLoadingEmployee(false);
    });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setFeedback(null);

    if (!currentPassword.trim()) {
      setFeedback({ type: "error", text: "يرجى إدخال كلمة المرور الحالية" });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFeedback({
        type: "error",
        text: `كلمة المرور الجديدة يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "كلمة المرور الجديدة وتأكيدها غير متطابقين" });
      return;
    }

    setIsSubmitting(true);
    const result = await changeEmployeePassword({
      employeeNumber: employee.employeeNumber,
      currentPassword,
      newPassword,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setFeedback({ type: "error", text: result.message ?? "تعذر تحديث كلمة المرور" });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback({ type: "success", text: "تم تحديث كلمة المرور بنجاح" });
  }

  if (isLoadingEmployee) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F5F6F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E7EB] border-t-[#123F63]" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F6F7] pb-10 font-cairo">
      <header className="flex items-center gap-3 bg-[#17212B] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-white">
          ←
        </button>
        <h1 className="text-base font-bold text-white">تغيير كلمة المرور</h1>
      </header>

      <main className="px-6 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="currentPassword"
            label="كلمة المرور الحالية"
            type="password"
            placeholder="أدخل كلمة المرور الحالية"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <TextField
            id="newPassword"
            label="كلمة المرور الجديدة"
            type="password"
            placeholder={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <TextField
            id="confirmPassword"
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            placeholder="أعد إدخال كلمة المرور الجديدة"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {feedback && (
            <div
              className={`rounded-xl p-3 text-center text-[13px] font-semibold ${
                feedback.type === "success"
                  ? "bg-[#EAF7F0] text-[#16803C]"
                  : "bg-[#FBEAE8] text-[#C0392B]"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2">
            حفظ كلمة المرور الجديدة
          </Button>
        </form>
      </main>
    </div>
  );
}
