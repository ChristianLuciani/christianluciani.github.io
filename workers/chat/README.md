# Chat proxy — Cloudflare Worker (#145 §2.5/§3)

Proxy server-side del chat del client lab. **La API key vive sólo acá** (secret
`OPENROUTER_API_KEY`), nunca en el HTML/JS del cliente.

```
browser (/clients/<slug>/) → POST /api/chat → Worker → OpenRouter (free-first + fallback pago)
                                   ↑ secret + rate limit + budget + kill switch
                                   ↑ chat-context.json (sólo perfil público, servido por el sitio)
```

## Deploy (v1: `workers.dev`)

```bash
cd workers/chat
npm i -g wrangler            # o: npx wrangler
wrangler login
wrangler secret put OPENROUTER_API_KEY   # una sola vez; nunca en el repo
wrangler deploy                          # → https://client-lab-chat.<account>.workers.dev
```

Después fijá el endpoint en el sitio (build del lab) con la variable de entorno
`VITE_CHAT_ENDPOINT=https://client-lab-chat.<account>.workers.dev/api/chat`, o
en el config del cliente (`chat.endpoint` en `src/content/clients/*.ts`).
Dominio propio cuando esté disponible (Custom Domain del Worker); DuckDNS no
aplica a un Worker (es DNS dinámico/tunnel, no un host de Worker).

## Modelo free y fallback

`MODEL_ALLOWLIST` (var de `wrangler.toml`) es la cascada, free-first: si un
modelo `:free` devuelve 429/402/5xx se intenta el siguiente. No hardcodear un
modelo que pueda desaparecer: verificar los `:free` vigentes de OpenRouter al
deploy y ajustar la allowlist. El fallback pago existe para que la demo no se
caiga; el techo duro es el budget.

## Seguridad / costo / límites

- **Key**: secret del Worker (`wrangler secret put`), nunca en el repo ni en `wrangler.toml`.
- **CORS**: sólo `https://christianluciani.github.io` y `localhost`; se valida `Origin`.
- **Rate limit** (Durable Object `RateLimiter`, contadores atómicos): 5/min/IP ·
  15/h/IP · 40/día/IP · 100/día global · 300/mes global · 1 concurrente/IP ·
  2 globales.
- **Turnos/input/output**: máx 4 turnos de usuario (8 mensajes), 300 chars por
  mensaje **de usuario** (el historial `assistant` se reenvía completo — hasta
  250 tokens ≈ 600–1000 chars — acordonado a 8000 como guardarrail de abuso),
  250 tokens de salida, temperatura 0.2.
- **Budget**: USD 1 total; alerta a 0.75 (header `x-budget-alert`), hard stop a
  0.95 (503 `budget_exceeded`), sin auto-top-up. `PRICES_JSON` mapea modelo →
  precio USD/M tokens; los `:free` cuestan 0. **Fail closed**: un modelo pago sin
  precio declarado (o sin chunk de `usage`) registra costo = budget completo →
  hard stop inmediato. Agregar un fallback pago exige cargar su precio.
- **Concurrencia**: los slots `inflight` (1/IP, 2 globales) se liberan siempre —
  también en abortos por timeout (30 s) o desconexión del cliente (respuesta
  504); un proveedor lento no deja a la IP en 429 permanente.
- **Kill switch**: `CHAT_ENABLED=false` → 503 `chat_disabled`.
- **Streaming**: SSE desde v1 con keep-alive y timeout de 30 s; fallback JSON
  sólo si el cliente lo pide (`Accept: application/json`) o el navegador no
  soporta streaming.
- **Privacidad**: el contexto lo carga el servidor (`CONTEXT_URL`, cacheado 5
  min) — el cliente no puede inyectar contexto. No si loguea contenido de
  mensajes, sólo counts. Prompt injection no puede sacar lo que no está en el
  contexto (sólo hay perfil público).
- **Headers OpenRouter**: `HTTP-Referer`/`X-Title` del sitio y
  `stream_options.include_usage` para contabilizar costo.

## Tests

```bash
npm run test:worker    # node --test workers/chat/index.test.mjs (provider mockeado)
```

Los tests corren en Node con el provider mockeado: ok, cascada 429→fallback,
input inválido, kill switch, origin, rate limit, budget, modo JSON e inyección
de prompt (el contexto siempre sale del servidor).
