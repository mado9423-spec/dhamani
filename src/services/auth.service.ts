import { supabase } from "../lib/supabaseClient";

interface CitizenLoginInput {
  fullName: string;
  pensionNumber: string;
  branchCode: string;
}

interface EmployeeLoginInput {
  employeeNumber: string;
  password: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function citizenLogin({
  fullName,
  pensionNumber,
  branchCode,
}: CitizenLoginInput): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/citizen-login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        full_name: fullName,
        pension_number: pensionNumber,
        branch_code: branchCode,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: result.error ?? "تعذر تسجيل الدخول، تحقق من البيانات المدخلة",
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });

  if (error) {
    return { success: false, message: "تعذر بدء الجلسة، يرجى المحاولة مجدداً" };
  }

  return { success: true };
}

export async function employeeLogin({
  employeeNumber,
  password,
}: EmployeeLoginInput): Promise<{ success: boolean; message?: string }> {
  const syntheticEmail = `${employeeNumber.trim()}@staff.dhamani.ly`;

  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    return {
      success: false,
      message: "رقم الموظف أو كلمة المرور غير صحيحة",
    };
  }

  return { success: true };
}

export async function signOut() {
  await supabase.auth.signOut();
}

interface ChangeEmployeePasswordInput {
  employeeNumber: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * يتحقق من كلمة المرور الحالية بإعادة تسجيل الدخول بها قبل التحديث،
 * بدل الاكتفاء بوجود جلسة نشطة — يمنع تغيير كلمة المرور من جهاز تُرك
 * مفتوحاً دون معرفة كلمة المرور الحالية فعلياً.
 */
export async function changeEmployeePassword({
  employeeNumber,
  currentPassword,
  newPassword,
}: ChangeEmployeePasswordInput): Promise<{ success: boolean; message?: string }> {
  const syntheticEmail = `${employeeNumber.trim()}@staff.dhamani.ly`;

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, message: "كلمة المرور الحالية غير صحيحة" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    return {
      success: false,
      message: updateError.message.includes("Password")
        ? "كلمة المرور الجديدة ضعيفة جداً، جرّب كلمة مرور أطول"
        : "تعذر تحديث كلمة المرور، حاول مرة أخرى",
    };
  }

  return { success: true };
}
