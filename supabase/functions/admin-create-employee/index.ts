import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOOTSTRAP_SECRET = Deno.env.get("ADMIN_BOOTSTRAP_SECRET")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const providedSecret = req.headers.get("x-admin-secret");
  if (!BOOTSTRAP_SECRET || providedSecret !== BOOTSTRAP_SECRET) {
    return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401 });
  }

  try {
    const { employee_number, full_name, branch_code, role, password } = await req.json();

    if (!employee_number || !full_name || !branch_code || !role || !password) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), { status: 400 });
    }

    if (!["employee", "supervisor", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "دور غير صالح" }), { status: 400 });
    }

    const { data: branch } = await adminClient
      .from("branches")
      .select("id")
      .eq("code", branch_code)
      .maybeSingle();

    if (!branch) {
      return new Response(JSON.stringify({ error: "فرع غير موجود" }), { status: 400 });
    }

    const syntheticEmail = `${employee_number}@staff.dhamani.ly`;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "تعذر إنشاء الحساب" }),
        { status: 500 }
      );
    }

    const { error: insertError } = await adminClient.from("employees").insert({
      auth_user_id: created.user.id,
      employee_number,
      full_name,
      branch_id: branch.id,
      role,
    });

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "خطأ غير متوقع" }), { status: 500 });
  }
});
