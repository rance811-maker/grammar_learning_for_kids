// 作文批改云函数：登录用户提交写作任务，用网站自己的 Claude key 逐句批改。
//
// - 只给登录用户用（自己核对 token，不靠网关的 verify_jwt）
// - 每个账号每天（北京时间）最多 DAILY_LIMIT 篇，计数在 public.gq_ai_usage（docs/ai-review-setup.sql）
// - 提示词在服务端拼（review.ts），前端只传写作内容：这个接口不能被当成通用的免费 AI 接口
// - 批改失败把这一次的额度退回去
//
// 需要的密钥：ANTHROPIC_API_KEY（Supabase 控制台 → Edge Functions → Secrets）。
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 由平台自动提供。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { buildUserText, parseReview, systemPromptFor, validateInput } from "./review.ts";

const DAILY_LIMIT = 3;
const MODEL = "claude-sonnet-4-6";
const KIND = "writing";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?grammar-quest\.net$/,
  /^https:\/\/([a-z0-9-]+--)?grammar-quest-pet\.netlify\.app$/,
  /^https:\/\/rance811-maker\.github\.io$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function corsHeaders(origin: string | null): Record<string, string> {
  const ok = origin && ALLOWED_ORIGINS.some((r) => r.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://www.grammar-quest.net",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

// 用服务端密钥调数据库函数（计数 / 退还），返回函数的 JSON 结果
async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${name} ${res.status}: ${await res.text()}`);
  return await res.json();
}

// 请求里带的登录令牌属于哪个用户；无效或是匿名 key 时返回 null
async function userIdFrom(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user && typeof user.id === "string" && user.id ? user.id : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);

  const userId = await userIdFrom(req);
  if (!userId) return json(401, { error: "login_required" }, origin);

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, origin); }
  const { input, error } = validateInput(body);
  if (!input) return json(400, { error }, origin);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(503, { error: "not_configured" }, origin);

  // 先占一次额度：返回今天已用的次数；到上限时返回 null
  const used = await rpc("gq_ai_take", { p_user: userId, p_kind: KIND, p_limit: DAILY_LIMIT }) as number | null;
  if (used == null) return json(429, { error: "daily_limit", limit: DAILY_LIMIT, remaining: 0 }, origin);

  const client = new Anthropic({ apiKey });
  try {
    let lastErr: unknown = null;
    // 偶尔返回的 JSON 不完整：再试一次（不另算额度）
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPromptFor(input),
        messages: [{ role: "user", content: buildUserText(input) }],
      });
      let text = "";
      for (const block of response.content) {
        if (block.type === "text") text += block.text;
      }
      if (response.stop_reason === "max_tokens") { lastErr = new Error("truncated"); continue; }
      try {
        const review = parseReview(text, input.lines.length);
        return json(200, { ...review, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) }, origin);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("bad_format");
  } catch (e) {
    // 没批改成功，这一次不算
    await rpc("gq_ai_refund", { p_user: userId, p_kind: KIND }).catch((err) => console.error("refund failed", err));
    if (e instanceof Anthropic.RateLimitError) {
      console.error("anthropic rate limited", e.status, e.message);
      return json(503, { error: "ai_busy" }, origin);
    } else if (e instanceof Anthropic.InternalServerError) {
      console.error("anthropic server error", e.status, e.message);
      return json(503, { error: "ai_busy" }, origin);
    } else if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("anthropic key problem", e.status, e.message);
      return json(503, { error: "not_configured" }, origin);
    } else if (e instanceof Anthropic.APIError) {
      console.error("anthropic api error", e.status, e.message);
      return json(502, { error: "ai_failed" }, origin);
    }
    console.error("review failed", e);
    return json(502, { error: "ai_failed" }, origin);
  }
});
