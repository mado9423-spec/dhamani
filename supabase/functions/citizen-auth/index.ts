import { createClient } from "npm:@supabase/supabase-js@2";

// Dhamani citizen auth: activation (code from branch + new PIN) and PIN login.
// verify_jwt is false because the caller is not signed in yet; all checks live in the DB functions.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, opts);
const anonClient = createClient(SUPABASE_URL, ANON_KEY, opts);

const MSG = {
  generic: "تعذر تسجيل الدخول، تحقق من البيانات المدخلة",
  activation: "رمز التفعيل غير صحيح أو منتهٍ، راجع الفرع للحصول على رمز جديد",
  rate: "عدد كبير جداً من المحاولات، يرجى المحاولة لاحقاً",
  weak: "الرقم السري سهل التخمين، اختر رقماً آخر",
  inactive: "هذا الحساب غير نشط، يرجى مراجعة الفرع",
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.length === 0) {
    h["Access-Control-Allow-Origin"] = "*";
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  return h;
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

async function mintSession(pension: string, citizenId: string, authUserId: string | null) {
  const email = `${pension.toLowerCase()}@citizen.dhamani.ly`;
  let uid = authUserId;

  if (!uid) {
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { citizen_id: citizenId },
    });
    if (error || !created?.user) return null;
    uid = created.user.id;
    const { error: linkErr } = await adminClient
      .from("citizens")
      .update({ auth_user_id: uid })
      .eq("id", citizenId)
      .is("auth_user_id", null);
    if (linkErr) return null;
  }

  const { data: linkData, error: genErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (genErr || !linkData) return null;

  const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyErr || !sessionData.session) return null;

  await adminClient.from("audit_logs").insert({
    actor_id: uid,
    actor_type: "citizen",
    action: "login",
    table_name: "citizens",
    record_id: citizenId,
  });

  return {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const raw = await req.text();
    if (raw.length > 2000) return json(req, { error: MSG.generic }, 413);
    const body = JSON.parse(raw);
    const action = String(body?.action ?? "");
    const pension = String(body?.pension_number ?? "").trim();
    const pin = String(body?.pin ?? "");
    const ip = clientIp(req);

    let result: any;
    if (action === "login") {
      const { data, error } = await adminClient.rpc("citizen_verify_pin", {
        p_pension: pension, p_pin: pin, p_ip: ip,
      });
      if (error) return json(req, { error: MSG.generic }, 500);
      result = data;
    } else if (action === "activate") {
      const { data, error } = await adminClient.rpc("citizen_activate", {
        p_pension: pension, p_code: String(body?.activation_code ?? ""), p_pin: pin, p_ip: ip,
      });
      if (error) return json(req, { error: MSG.generic }, 500);
      result = data;
    } else {
      return json(req, { error: MSG.generic }, 400);
    }

    if (!result?.ok) {
      switch (result?.reason) {
        case "rate_limited": return json(req, { error: MSG.rate }, 429);
        case "weak_pin": return json(req, { error: MSG.weak, code: "weak_pin" }, 422);
        case "inactive": return json(req, { error: MSG.inactive }, 403);
        default:
          return json(req, { error: action === "activate" ? MSG.activation : MSG.generic }, 401);
      }
    }

    const session = await mintSession(pension, result.citizen_id, result.auth_user_id ?? null);
    if (!session) return json(req, { error: MSG.generic }, 500);
    return json(req, session, 200);
  } catch {
    return json(req, { error: MSG.generic }, 400);
  }
});
