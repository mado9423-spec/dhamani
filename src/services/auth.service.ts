import { supabase } from "../lib/supabaseClient";

interface CitizenLoginInput {
  pensionNumber: string;
  pin: string;
}

interface CitizenActivateInput {
  pensionNumber: string;
  activationCode: string;
  pin: string;
}

interface EmployeeLoginInput {
  employeeNumber: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  code?: string;
}

interface CitizenAuthResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  code?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const GENERIC_ERROR = "تعذر تسجيل الدخول، تحقق من البيانات المدخلة";

async function callCitizenAuth(body: Record<string, string>): Promise<AuthResult> {
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/citizen-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, message: "تعذر الاتصال بالخادم، تحقق من الإنترنت" };
  }

  let result: CitizenAuthResponse = {};
  try {
    result = (await response.json()) as CitizenAuthResponse;
  } catch {
    result = {};
  }

  if (!response.ok || !result.access_token || !result.refresh_token) {
    return {
      success: false,
      message: result.error ?? GENERIC_ERROR,
      code: result.code,
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

export function citizenLogin({
  pensionNumber,
  pin,
}: CitizenLoginInput): Promise<AuthResult> {
  return callCitizenAuth({
    action: "login",
    pension_number: pensionNumber,
    pin,
  });
}

export function citizenActivate({
  pensionNumber,
  activationCode,
  pin,
}: CitizenActivateInput): Promise<AuthResult> {
  return callCitizenAuth({
    action: "activate",
    pension_number: pensionNumber,
    activation_code: activationCode,
    pin,
  });
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
