const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface KeyRow {
  id: string;
  provider: string;
  key_value: string;
  label: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

let cachedAdminSecret: { value: string; at: number } | null = null;

async function getAdminSecret(): Promise<string> {
  if (cachedAdminSecret && Date.now() - cachedAdminSecret.at < 60_000) {
    return cachedAdminSecret.value;
  }
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/app_secrets?name=eq.admin_api_secret&select=value`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!resp.ok) return "";
  const rows = await resp.json();
  const value = ((rows as { value: string }[])[0]?.value) || "";
  cachedAdminSecret = { value, at: Date.now() };
  return value;
}

async function isAdmin(req: Request): Promise<boolean> {
  const expected = await getAdminSecret();
  if (!expected) return false;
  const provided = req.headers.get("x-admin-secret") || "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return key.slice(0, 6) + "****" + key.slice(-4);
}

function maskRows(rows: KeyRow[]) {
  return rows.map((r) => ({ ...r, key_value: maskKey(r.key_value) }));
}

async function dbFetch(path: string, method: string, body?: unknown) {
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  const opts: RequestInit & { body?: string } = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  const text = await resp.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: resp.status, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/functions\/v1\/ai-keys-mgmt\/?/, "");
    const segments = path.split("/").filter(Boolean);

    if (!(await isAdmin(req)))
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // GET - list all keys (masked)
    if (req.method === "GET") {
      const { status, data } = await dbFetch(
        "ai_provider_keys?order=provider.asc,priority.asc",
        "GET"
      );
      if (status !== 200)
        return new Response(JSON.stringify({ error: "Failed to fetch keys" }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify(maskRows(data as KeyRow[])),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST - add new key
    if (req.method === "POST") {
      const body = await req.json();
      const { provider, key_value, label, priority } = body;
      if (!provider || !key_value)
        return new Response(JSON.stringify({ error: "provider and key_value required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { status, data } = await dbFetch("ai_provider_keys", "POST", {
        provider,
        key_value,
        label: label || null,
        is_active: true,
        priority: priority ?? 99,
      });
      if (status !== 201)
        return new Response(JSON.stringify({ error: "Insert failed" }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const row = (data as KeyRow[])[0];
      return new Response(JSON.stringify({ ...row, key_value: maskKey(row.key_value) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PATCH - update key (toggle active, change priority/label)
    if (req.method === "PATCH" && segments[0]) {
      const id = segments[0];
      const body = await req.json();
      const update: Record<string, unknown> = {};
      if (typeof body.is_active === "boolean") update.is_active = body.is_active;
      if (typeof body.priority === "number") update.priority = body.priority;
      if (typeof body.label === "string") update.label = body.label;
      if (typeof body.key_value === "string") update.key_value = body.key_value;
      const { status, data } = await dbFetch(
        `ai_provider_keys?id=eq.${id}`,
        "PATCH",
        update
      );
      if (status !== 200)
        return new Response(JSON.stringify({ error: "Update failed" }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const rows = data as KeyRow[];
      const masked = rows.length > 0 ? { ...rows[0], key_value: maskKey(rows[0].key_value) } : null;
      return new Response(JSON.stringify(masked),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE - remove key
    if (req.method === "DELETE" && segments[0]) {
      const id = segments[0];
      const { status } = await dbFetch(`ai_provider_keys?id=eq.${id}`, "DELETE");
      if (status !== 204 && status !== 200)
        return new Response(JSON.stringify({ error: "Delete failed" }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
