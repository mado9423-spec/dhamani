import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

const GENERIC_ERROR = {
  error: "تعذر تسجيل الدخول، تحقق من البيانات المدخلة",
};

const attemptsMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attemptsMap.get(key);
  if (!entry || now > entry.resetAt) {
    attemptsMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { full_name, pension_number, branch_code } = await req.json();

    if (!full_name?.trim() || !pension_number?.trim() || !branch_code?.trim()) {
      return new Response(JSON.stringify(GENERIC_ERROR), { status: 400 });
    }

    if (isRateLimited(pension_number.trim())) {
      return new Response(
        JSON.stringify({
          error: "عدد كبير جداً من المحاولات، يرجى المحاولة لاحقاً",
        }),
        { status: 429 }
      );
    }

    const { data: branch } = await adminClient
      .from("branches")
      .select("id")
      .eq("code", branch_code.trim())
      .maybeSingle();

    if (!branch) {
      return new Response(JSON.stringify(GENERIC_ERROR), { status: 401 });
    }

    const { data: citizen } = await adminClient
      .from("citizens")
      .select("id, auth_user_id, full_name, status")
      .eq("pension_number", pension_number.trim())
      .eq("branch_id", branch.id)
      .maybeSingle();

    if (!citizen || citizen.full_name.trim() !== full_name.trim()) {
      return new Response(JSON.stringify(GENERIC_ERROR), { status: 401 });
    }

    if (citizen.status !== "active") {
      return new Response(
        JSON.stringify({ error: "هذا الحساب غير نشط، يرجى مراجعة الفرع" }),
        { status: 403 }
      );
    }

    const syntheticEmail = `${pension_number.trim()}@citizen.dhamani.ly`;
    let authUserId = citizen.auth_user_id as string | null;

    if (!authUserId) {
      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          email: syntheticEmail,
          email_confirm: true,
          user_metadata: { citizen_id: citizen.id },
        });

      if (createError || !created.user) {
        return new Response(JSON.stringify(GENERIC_ERROR), { status: 500 });
      }

      authUserId = created.user.id;

      await adminClient
        .from("citizens")
        .update({ auth_user_id: authUserId })
        .eq("id", citizen.id);
    }

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });

    if (linkError || !linkData) {
      return new Response(JSON.stringify(GENERIC_ERROR), { status: 500 });
    }

    const { data: sessionData, error: verifyError } =
      await anonClient.auth.verifyOtp({
        type: "magiclink",
        token_hash: linkData.properties.hashed_token,
      });

    if (verifyError || !sessionData.session) {
      return new Response(JSON.stringify(GENERIC_ERROR), { status: 500 });
    }

    await adminClient.from("audit_logs").insert({
      actor_id: authUserId,
      actor_type: "citizen",
      action: "login",
      table_name: "citizens",
      record_id: citizen.id,
    });

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify(GENERIC_ERROR), { status: 500 });
  }
});
