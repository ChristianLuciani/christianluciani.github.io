/**
 * Chat proxy — Cloudflare Worker (#145 §2.5/§3).
 *
 *   browser → POST /api/chat → este Worker → OpenRouter (free-first, fallback pago)
 *
 * La API key vive SOLO acá (secret OPENROUTER_API_KEY), nunca en el cliente.
 * Rate limits por IP y globales con contadores atómicos en un Durable Object;
 * budget USD 1 (alerta 0.75, hard stop 0.95); kill switch CHAT_ENABLED=false;
 * SSE desde v1 (fallback JSON si el cliente lo pide con Accept: application/json);
 * CORS sólo para el origen del sitio y localhost. No se loguea contenido de
 * mensajes, sólo counts. El contexto (chat-context.json) lo carga el servidor
 * — el cliente no puede inyectar contexto.
 *
 * Deploy: ver workers/chat/README.md (wrangler). Tests: npm run test:worker
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_ORIGIN = "https://christianluciani.github.io";
const ALLOWED_ORIGINS = new Set([SITE_ORIGIN]);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const DEFAULTS = {
  CHAT_ENABLED: "true",
  BUDGET_USD: "1",
  MAX_TURNS_USER: "4",
  MAX_MESSAGES: "8",
  MAX_INPUT_CHARS: "300",
  MAX_OUTPUT_TOKENS: "250",
  TEMPERATURE: "0.2",
  // Límites (issue #145 §Decisiones): 5/min/IP · 15/h/IP · 40/día/IP · 100/día global · 300/mes · 1 concurrente/IP · 2 globales
  RATE_MIN_IP: "5",
  RATE_HOUR_IP: "15",
  RATE_DAY_IP: "40",
  RATE_DAY_GLOBAL: "100",
  RATE_MONTH_GLOBAL: "300",
  CONC_IP: "1",
  CONC_GLOBAL: "2",
  BUDGET_ALERT: "0.75",
  BUDGET_STOP: "0.95",
  STREAM_TIMEOUT_MS: "30000",
  CONTEXT_URL: `${SITE_ORIGIN}/agent/chat-context.json`,
  // Allowlist configurable por env; free-first. No hardcodear un modelo que
  // pueda desaparecer: ajustá MODEL_ALLOWLIST en el deploy.
  MODEL_ALLOWLIST: "google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free"
};

const SYSTEM_PROMPT = `You are the assistant for Christian Luciani's public profile.
Answer ONLY from the CONTEXT below. If the answer is not in the context, say
"This is not in the public profile" and suggest contacting Christian.
Cite the section id when you assert a fact, as [section-id]. Never invent metrics, never discuss
salary, personal data, or opinions. Answer in the user's language, max 120 words.
CONTEXT: `;

function originAllowed(origin) {
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept"
  };
}

function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin), ...extra }
  });
}

function validateMessages(messages, env) {
  if (!Array.isArray(messages)) return "messages debe ser un array";
  if (messages.length === 0) return "messages vacío";
  if (messages.length > Number(env.MAX_MESSAGES ?? DEFAULTS.MAX_MESSAGES)) {
    return `máx ${env.MAX_MESSAGES ?? DEFAULTS.MAX_MESSAGES} mensajes (4 turnos)`;
  }
  // El tope de 300 chars es del INPUT del usuario. El rol assistant reenvía
  // respuestas del modelo (hasta 250 tokens ≈ 600–1000 chars) y NO se trunca:
  // un historial multi-turno con respuestas largas debe ser válido. Sí se
  // acordona al abuso con un tope amplio para assistant.
  const maxChars = Number(env.MAX_INPUT_CHARS ?? DEFAULTS.MAX_INPUT_CHARS);
  const maxAssistantChars = Number(env.MAX_ASSISTANT_CHARS ?? 8000);
  let userCount = 0;
  for (const message of messages) {
    if (typeof message !== "object" || message === null) return "mensaje inválido";
    if (message.role !== "user" && message.role !== "assistant") return "role debe ser user|assistant";
    if (typeof message.content !== "string" || message.content.length === 0) return "content vacío";
    if (message.role === "user") {
      if (message.content.length > maxChars) return `content de usuario supera ${maxChars} caracteres`;
      userCount += 1;
    } else if (message.content.length > maxAssistantChars) {
      return `content de assistant supera ${maxAssistantChars} caracteres`;
    }
  }
  if (userCount > Number(env.MAX_TURNS_USER ?? DEFAULTS.MAX_TURNS_USER)) return "máx 4 turnos de usuario";
  if (messages[messages.length - 1].role !== "user") return "el último mensaje debe ser user";
  return null;
}

/* ── Durable Object: contadores atómicos de rate limit, concurrencia y spend ── */

export class RateLimiter {
  constructor(state, env) {
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/check") return this.#check(request);
    if (url.pathname === "/release") return this.#release(request);
    if (url.pathname === "/spend") return this.#spend(request);
    return new Response("not found", { status: 404 });
  }

  async #state() {
    return (await this.storage.get("counters")) ?? { ip: {}, global: {}, inflight: { ip: {}, global: 0 }, spend: 0 };
  }

  async #check(request) {
    const { ip } = await request.json();
    const env = this.env;
    const now = Date.now();
    const state = await this.#state();
    const minKey = `m:${Math.floor(now / 60000)}`;
    const hourKey = `h:${Math.floor(now / 3600000)}`;
    const dayKey = `d:${new Date(now).toISOString().slice(0, 10)}`;
    const monthKey = `mo:${new Date(now).toISOString().slice(0, 7)}`;
    const ipState = (state.ip[ip] ??= {});
    const counts = {
      min: ipState[minKey] ?? 0,
      hour: ipState[hourKey] ?? 0,
      day: ipState[dayKey] ?? 0,
      month: state.global[monthKey] ?? 0,
      dayGlobal: state.global[dayKey] ?? 0,
      inflightIp: state.inflight.ip[ip] ?? 0,
      inflightGlobal: state.inflight.global
    };
    const limit = (name, value) => value >= Number(env[name] ?? DEFAULTS[name]);
    if (
      limit("RATE_MIN_IP", counts.min) ||
      limit("RATE_HOUR_IP", counts.hour) ||
      limit("RATE_DAY_IP", counts.day) ||
      limit("RATE_DAY_GLOBAL", counts.dayGlobal) ||
      limit("RATE_MONTH_GLOBAL", counts.month) ||
      counts.inflightIp >= Number(env.CONC_IP ?? DEFAULTS.CONC_IP) ||
      counts.inflightGlobal >= Number(env.CONC_GLOBAL ?? DEFAULTS.CONC_GLOBAL)
    ) {
      return Response.json({ allowed: false });
    }
    ipState[minKey] = counts.min + 1;
    ipState[hourKey] = counts.hour + 1;
    ipState[dayKey] = counts.day + 1;
    state.global[dayKey] = counts.dayGlobal + 1;
    state.global[monthKey] = counts.month + 1;
    state.inflight.ip[ip] = counts.inflightIp + 1;
    state.inflight.global = counts.inflightGlobal + 1;
    await this.storage.put("counters", state);
    return Response.json({ allowed: true });
  }

  async #release(request) {
    const { ip } = await request.json();
    const state = await this.#state();
    state.inflight.ip[ip] = Math.max(0, (state.inflight.ip[ip] ?? 1) - 1);
    state.inflight.global = Math.max(0, state.inflight.global - 1);
    await this.storage.put("counters", state);
    return Response.json({ ok: true });
  }

  async #spend(request) {
    const { usd: rawUsd, checkOnly } = await request.json();
    const state = await this.#state();
    const budget = Number(this.env.BUDGET_USD ?? DEFAULTS.BUDGET_USD);
    // Costo no finito (fail closed de usageCost) = hard stop inmediato.
    const usd = Number.isFinite(rawUsd) ? rawUsd : budget;
    if (!checkOnly) state.spend = (state.spend ?? 0) + usd;
    await this.storage.put("counters", state);
    return Response.json({
      spend: state.spend,
      alert: state.spend >= Number(this.env.BUDGET_ALERT ?? DEFAULTS.BUDGET_ALERT) * budget,
      stop: state.spend >= Number(this.env.BUDGET_STOP ?? DEFAULTS.BUDGET_STOP) * budget
    });
  }
}

/* ── Contexto del chat: lo carga el servidor, cacheado; nunca del cliente ── */

let contextCache = { at: 0, value: null };

async function loadContext(env) {
  if (typeof env.CHAT_CONTEXT === "string" && env.CHAT_CONTEXT.trim()) {
    return env.CHAT_CONTEXT; // bundled
  }
  const now = Date.now();
  if (contextCache.value && now - contextCache.at < 5 * 60 * 1000) return contextCache.value;
  const url = env.CONTEXT_URL ?? DEFAULTS.CONTEXT_URL;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`chat-context.json → ${response.status}`);
  const json = await response.json();
  if (!json || !Array.isArray(json.sections)) throw new Error("chat-context.json inválido");
  contextCache = { at: now, value: JSON.stringify(json) };
  return contextCache.value;
}

function providerHeaders(env) {
  return {
    authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    "content-type": "application/json",
    "http-referer": SITE_ORIGIN,
    "x-title": "christianluciani.github.io client lab"
  };
}

async function callProvider(model, env, messages, stream, signal) {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: providerHeaders(env),
    signal,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: Number(env.MAX_OUTPUT_TOKENS ?? DEFAULTS.MAX_OUTPUT_TOKENS),
      temperature: Number(env.TEMPERATURE ?? DEFAULTS.TEMPERATURE),
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {})
    })
  });
}

function modelAllowlist(env) {
  return String(env.MODEL_ALLOWLIST ?? DEFAULTS.MODEL_ALLOWLIST)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function prices(env) {
  try {
    return JSON.parse(env.PRICES_JSON ?? "{}");
  } catch {
    return {};
  }
}

function usageCost(usage, model, env) {
  // Los :free cuestan 0 aunque no llegue chunk de usage.
  if (model.endsWith(":free")) return 0;
  // FAIL CLOSED: un modelo pago sin precio declarado en PRICES_JSON, o sin
  // usage recibido, cuenta como hard stop (costo = budget) — el control de
  // costo nunca falla abierto.
  const price = prices(env)[model];
  if (!price || !usage) return Number.POSITIVE_INFINITY;
  return ((usage.prompt_tokens ?? 0) * (price.input ?? 0) + (usage.completion_tokens ?? 0) * (price.output ?? 0)) / 1e6;
}

async function limitsCall(env, path, body) {
  const id = env.LIMITS.idFromName("counters");
  const stub = env.LIMITS.get(id);
  const response = await stub.fetch(`https://limits/${path}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return response.json();
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("origin") ?? "";
    if (request.method === "OPTIONS") {
      if (!originAllowed(origin)) return new Response("forbidden", { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/chat") {
      return json({ error: "not_found" }, 404, origin);
    }
    if (!originAllowed(origin)) return json({ error: "forbidden" }, 403, origin);
    if ((env.CHAT_ENABLED ?? DEFAULTS.CHAT_ENABLED) === "false") {
      return json({ error: "chat_disabled" }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, origin);
    }
    const validationError = validateMessages(body?.messages, env);
    if (validationError) return json({ error: validationError }, 400, origin);

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const release = () =>
      env.LIMITS
        ? limitsCall(env, "release", { ip }).catch(() => {})
        : Promise.resolve();

    // Budget: hard stop antes de gastar; alerta como header.
    const budget = await limitsCall(env, "spend", { usd: 0, checkOnly: true });
    if (budget.stop) return json({ error: "budget_exceeded" }, 503, origin);
    const extraHeaders = budget.alert ? { "x-budget-alert": "1" } : {};

    const gate = await limitsCall(env, "check", { ip });
    if (!gate.allowed) {
      return json({ error: "rate_limited" }, 429, origin, extraHeaders);
    }

    let context;
    try {
      context = await loadContext(env);
    } catch {
      await release();
      return json({ error: "context_unavailable" }, 502, origin);
    }

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT}${context}` },
      ...body.messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const streaming = !(request.headers.get("accept") ?? "").includes("application/json");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(env.STREAM_TIMEOUT_MS ?? DEFAULTS.STREAM_TIMEOUT_MS));
    if (timeout.unref) timeout.unref();
    request.signal.addEventListener("abort", () => controller.abort());

    const models = modelAllowlist(env);
    let providerResponse = null;
    let lastStatus = 0;
    for (const model of models) {
      // Aborto (timeout 30 s o desconexión del cliente): no se re-lanza — se
      // libera la concurrencia y se responde; el contador inflight del DO no
      // queda fugado.
      if (controller.signal.aborted) break;
      let response;
      try {
        response = await callProvider(model, env, messages, streaming, controller.signal);
      } catch {
        response = null;
      }
      if (controller.signal.aborted) break;
      if (!response) continue;
      if (response.ok) {
        providerResponse = { response, model };
        break;
      }
      lastStatus = response.status;
      // 429/402/5xx → fallback al siguiente modelo del allowlist
      if (!(response.status === 429 || response.status === 402 || response.status >= 500)) {
        clearTimeout(timeout);
        await release();
        return json({ error: "provider_rejected", status: response.status }, 400, origin);
      }
    }
    if (controller.signal.aborted) {
      clearTimeout(timeout);
      await release();
      return json({ error: "aborted" }, 504, origin);
    }
    if (!providerResponse) {
      clearTimeout(timeout);
      await release();
      return json({ error: "provider_unavailable", status: lastStatus || 502 }, 502, origin, extraHeaders);
    }

    const { response: upstream, model } = providerResponse;

    if (!streaming) {
      // Fallback JSON (el navegador no soporta streaming): respuesta completa.
      try {
        const data = await upstream.json();
        const content = data.choices?.[0]?.message?.content ?? "";
        const cost = usageCost(data.usage, model, env);
        if (cost > 0) ctx.waitUntil(limitsCall(env, "spend", { usd: cost }));
        ctx.waitUntil(release());
        clearTimeout(timeout);
        return json({ message: { role: "assistant", content }, usage: data.usage ?? null }, 200, origin, extraHeaders);
      } catch {
        clearTimeout(timeout);
        await release();
        return json({ error: "provider_unavailable" }, 502, origin);
      }
    }

    // SSE: se reenvían los chunks del provider tal cual; keep-alive y timeout de 30s.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const keepAlive = setInterval(() => {
      writer.write(encoder.encode(": keep-alive\n\n")).catch(() => {});
    }, 10000);
    if (keepAlive.unref) keepAlive.unref();

    (async () => {
      let usage = null;
      try {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let index;
          while ((index = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              break;
            }
            try {
              const chunk = JSON.parse(data);
              if (chunk.usage) usage = chunk.usage;
            } catch { /* chunk parcial */ }
            await writer.write(encoder.encode(`${line}\n\n`));
          }
        }
        const cost = usageCost(usage, model, env);
        if (cost > 0) ctx.waitUntil(limitsCall(env, "spend", { usd: cost }));
      } catch {
        // cliente desconectado o timeout: se cierra el stream
      } finally {
        clearInterval(keepAlive);
        clearTimeout(timeout);
        ctx.waitUntil(release());
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
        ...corsHeaders(origin),
        ...extraHeaders
      }
    });
  }
};
