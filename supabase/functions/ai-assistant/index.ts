const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في تحليل بيانات التجارة الإلكترونية والمحاسبة.
تجيب باللغة العربية بشكل دقيق وموجز. تحلل الأرقام وتقدم توصيات عملية.
عند إعطائك بيانات مبيعات أو محاسبية، تقدم رؤى قابلة للتنفيذ.
الأرقام والعملات تُعرض بالريال السعودي.`;

// Read keys from database via service role (bypasses RLS)
async function getKeys(provider: string): Promise<{ key_value: string; label: string | null }[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return [];

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/ai_provider_keys?provider=eq.${provider}&is_active=eq.true&order=priority.asc`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data as { key_value: string; label: string | null }[]) || [];
}

function extractText(data: Record<string, unknown>): string | null {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;
  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  if (candidates?.[0]?.content?.parts?.[0]?.text) return candidates[0].content.parts[0].text;
  const result = data.result as { response?: string } | undefined;
  if (result?.response) return result.response;
  return null;
}

// ── Provider implementations with key rotation from DB ────────

async function callGroq(prompt: string, system: string): Promise<string> {
  const keys = await getKeys("groq");
  if (keys.length === 0) throw new Error("No Groq keys configured");
  let lastErr = "";
  for (const k of keys) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${k.key_value}` },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      if (!resp.ok) { lastErr = `${resp.status}`; continue; }
      const text = extractText(await resp.json());
      if (!text) { lastErr = "no content"; continue; }
      return text;
    } catch (e) { lastErr = e.message; continue; }
  }
  throw new Error(`All ${keys.length} Groq keys failed: ${lastErr}`);
}

async function callGemini(prompt: string, system: string): Promise<string> {
  const keys = await getKeys("gemini");
  if (keys.length === 0) throw new Error("No Gemini keys configured");
  let lastErr = "";
  for (const k of keys) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${k.key_value}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${system}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );
      if (!resp.ok) { lastErr = `${resp.status}`; continue; }
      const text = extractText(await resp.json());
      if (!text) { lastErr = "no content"; continue; }
      return text;
    } catch (e) { lastErr = e.message; continue; }
  }
  throw new Error(`All ${keys.length} Gemini keys failed: ${lastErr}`);
}

async function callOpenRouter(prompt: string, system: string): Promise<string> {
  const keys = await getKeys("openrouter");
  if (keys.length === 0) throw new Error("No OpenRouter keys configured");
  let lastErr = "";
  for (const k of keys) {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${k.key_value}` },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      if (!resp.ok) { lastErr = `${resp.status}`; continue; }
      const text = extractText(await resp.json());
      if (!text) { lastErr = "no content"; continue; }
      return text;
    } catch (e) { lastErr = e.message; continue; }
  }
  throw new Error(`All ${keys.length} OpenRouter keys failed: ${lastErr}`);
}

async function callCloudflare(prompt: string, system: string): Promise<string> {
  const keys = await getKeys("cloudflare");
  if (keys.length === 0) throw new Error("No Cloudflare credentials configured");
  let lastErr = "";
  for (const k of keys) {
    const [accountId, token] = k.key_value.split(":").map((s) => s.trim());
    if (!accountId || !token) continue;
    try {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
            max_tokens: 1024,
          }),
        }
      );
      if (!resp.ok) { lastErr = `${resp.status}`; continue; }
      const text = extractText(await resp.json());
      if (!text) { lastErr = "no content"; continue; }
      return text;
    } catch (e) { lastErr = e.message; continue; }
  }
  throw new Error(`All ${keys.length} Cloudflare credentials failed: ${lastErr}`);
}

// ── Local fallback ────────────────────────────────────────────
function localAnalysis(prompt: string): string {
  const lp = prompt.toLowerCase();
  if (lp.includes("مبيعات") || lp.includes("sales"))
    return `تحليل المبيعات:\n1. ركّز على المنتجات الأكثر مبيعاً وزد مخزونها\n2. راقب المنتجات منخفضة المخزون\n3. استهدف العملاء بأعلى إنفاق\n4. راجع المنتجات بطيئة الحركة`;
  if (lp.includes("محاسب") || lp.includes("مالية"))
    return `التحليل المالي:\n1. راقق الإيرادات مقابل المصروفات\n2. حصّل الفواتير المتأخرة\n3. حافظ على سيولة صحية\n4. اربط ميزانية التسويق بالعائد`;
  if (lp.includes("مخزون"))
    return `تحليل المخزون:\n1. أعد طلب المنتجات منخفضة المخزون\n2. تنبأ بالطلب الموسمي\n3. طبّق نظام ABC\n4. تجنب تخزين المنتجات بطيئة الحركة`;
  return `مرحباً! أنا المساعد الذكي. أساعدك في:\n- تحليل المبيعات\n- الوضع المالي\n- تحليل المخزون\n- توصيات الأعمال\n\nاطرح سؤالك.`;
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== "string")
      return new Response(JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fullPrompt = context ? `بيانات السياق:\n${context}\n\nالسؤال: ${prompt}` : prompt;

    const providers: { name: string; fn: (p: string, s: string) => Promise<string> }[] = [
      { name: "groq", fn: callGroq },
      { name: "gemini", fn: callGemini },
      { name: "openrouter", fn: callOpenRouter },
      { name: "cloudflare", fn: callCloudflare },
    ];

    let response: string | null = null;
    let usedProvider = "local";
    const errors: string[] = [];

    for (const provider of providers) {
      try {
        response = await provider.fn(fullPrompt, SYSTEM_PROMPT);
        usedProvider = provider.name;
        break;
      } catch (err) {
        errors.push(`${provider.name}: ${err.message}`);
      }
    }

    if (!response) response = localAnalysis(fullPrompt);

    return new Response(
      JSON.stringify({ response, provider: usedProvider, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, response: localAnalysis(""), provider: "local" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
