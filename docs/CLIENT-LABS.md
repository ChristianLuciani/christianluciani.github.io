# Client labs (#145)

Área de cliente parametrizada: una ruta `/clients/<slug>/` generada desde un
archivo de configuración por cliente. El primer cliente es **Blacksmith**
(AI Automation Engineer); `example` es el cliente de prueba que demuestra en
CI que el sistema no depende de ningún slug hardcodeado.

La página deja de ser "un CV con diseño" y pasa a ser la demo de cómo se
trabaja: datos desde el SSOT (`PROFILE`), interfaces consumibles por agentes y
un chat que no inventa.

## Arquitectura

```
src/content/clients/
  types.ts        # ClientLab + validateClient
  blacksmith.ts   # cliente real
  example.ts      # cliente de prueba (CI prueba la parametrización)
  index.ts        # registro por slug: agregar un cliente = 1 archivo + 1 entrada
src/clients/
  page.ts         # render puro de /clients/<slug>/ y /clients/
  publish.ts      # publish al artefacto (entry del bundle lab inyectado)
src/agent/
  export.ts       # generators de public/agent/*.json desde PROFILE
  write.ts        # escritura/drift de public/agent/ (build.ts lo importa)
  schema.ts       # validateInput (JSON Schema subset)
  execute.ts      # runTool determinista (loader inyectable)
  verify.ts       # checkFacts: DOM vs snapshot (provenance)
  citations.ts    # extractCitations: [section-id] válidos
src/fit/matcher.ts  # matcher determinista JD → evidencia/gap
src/client/       # runtime del lab (bundle aparte, entry `lab` de Vite)
  main.ts lab.ts i18n.ts agent-console.ts fit.ts provenance.ts chat.ts
tools/build-agent.ts    # CLI: escribe public/agent/ (--check = gate de drift)
tools/build-clients.ts  # CLI: escribe clients/ (--dist = artefacto)
mcp/server.mjs          # servidor MCP stdio real (Node estándar, sin red)
workers/chat/           # proxy del chat (Cloudflare Worker; ver su README)
public/agent/           # manifest + JSON + chat-context (generados, commiteados)
clients/                # páginas commiteadas (como index.html; drift testeado)
```

Build: `npm run build` regenera `public/agent/*` y `clients/*` (fuente) antes
de `vite build`, y publica `dist/clients/<slug>/index.html` + `dist/agent/*`
después. Vite tiene dos entries: `main` (sitio) y `lab` (`src/client/main.ts`);
`entryPath(manifest, "src/client/main.ts")` lo inyecta en las páginas de cliente.

La home sólo suma un link discreto "Client labs" en el footer (`/clients/`).
Las páginas de cliente llevan `noindex` (no compiten con el CV público) y no
van al sitemap.

## Los cinco módulos

| Módulo | Qué prueba | Dónde |
|---|---|---|
| **Agent interface** | contrato de tools + JSON Schema + endpoints estáticos; la consola hace **GET** a `/agent/*.json` y aplica el filtro del input (determinista). Sin modelo, sin key (la UI lo dice). | `src/client/agent-console.ts` + `src/agent/execute.ts` |
| **MCP server** | MCP real por stdio, Node estándar, sin red ni secretos; la página documenta el contrato y el snippet de config. | `mcp/server.mjs` |
| **Fit explorer** | pega un JD → matcher determinista sobre PROFILE con mapa de sinónimos; evidencia con links o gap declarado. Sin LLM, sin score opaco. | `src/fit/matcher.ts` + `src/client/fit.ts` |
| **Provenance** | badge `profile-data @ <sha> · pasco <ver> · schema vX · <fecha>` y botón Verify que compara 3 hechos del DOM contra `profile.json`. El "último rol" usa la regla de recencia del repo (`end === "present"` = vigente), no `experience[0]`. | `src/agent/verify.ts` + `src/client/provenance.ts` |
| **Chat grounded** | preguntas sobre el perfil respondidas sólo desde el contexto público, con la API key en el proxy server-side. | `src/client/chat.ts` + `workers/chat/` |

## Datos para agentes: `public/agent/`

Generados desde `PROFILE` (ya es la proyección pública — `visibility=public`
filtrado aguas arriba por `sync-profile.ts`):

- `manifest.json` — 4 tools (`get_profile`, `list_projects`, `get_project`,
  `search_publications`), cada uno con `inputSchema` y `endpoint` estático.
- `profile.json` / `projects.json` / `publications.json` — datos públicos.
- `chat-context.json` — contexto del chat (≤ 6k tokens), secciones con `id`,
  `text` y `sources[]`; incluye la FAQ pública derivada del JSON-LD (#140).

Drift: `src/agent/agent.test.ts` compara byte a byte los archivos commiteados
con los regenerados; `npm run agent:check` es el gate de CLI.

## MCP server

```bash
node mcp/server.mjs        # stdio, JSON-RPC 2.0 newline-delimited
```

Config de cualquier host MCP:

```json
{ "mcpServers": { "profile": { "command": "node", "args": ["mcp/server.mjs"] } } }
```

Lee `public/agent/*.json`; `tools/list` con JSON Schema; `tools/call` con
validación y errores claros (`isError`). Tests de protocolo:
`npm run test:mcp`.

## Chat grounded (proxy server-side)

Arquitectura: `browser → POST /api/chat (Worker) → OpenRouter`, con el secret
`OPENROUTER_API_KEY` sólo en el Worker, rate limits en Durable Object, budget
USD 1 (alerta 0.75, hard stop 0.95), kill switch `CHAT_ENABLED=false`, SSE desde
v1 con fallback JSON, CORS sólo para el sitio y localhost. Deploy, modelos y
límites: [workers/chat/README.md](../workers/chat/README.md). Tests con provider
mockeado: `npm run test:worker`.

El endpoint llega al front-end por la **repository variable**
`VITE_CHAT_ENDPOINT` (deploy.yml la pasa al build; crearla en Settings →
Variables con la URL del Worker) o por `chat.endpoint` en el config del
cliente. Sin endpoint configurado el módulo degrada a "chat unavailable" y
el resto del lab sigue funcionando. El tope de
300 chars aplica sólo al input del usuario (el historial assistant se reenvía
completo); el budget es fail-closed (modelo pago sin precio en `PRICES_JSON` =
hard stop) y la concurrencia se libera también en abortos. Las rutas del
runtime resuelven bajo `import.meta.env.BASE_URL`, así que `SITE_BASE` no rompe
los fetch de `/agent/*`.

## Agregar un cliente

1. Crear `src/content/clients/acme.ts` con un `ClientLab` (slug `[a-z0-9-]+`,
   entry EN+ES, accent `#rrggbb`, `jd`, `modules`, `chat.suggested`, y
   `unlisted: true` si no debe aparecer en el índice `/clients/`).
2. Registrarlo en `src/content/clients/index.ts`.
3. `npm run build:clients` (commitea `clients/acme/index.html`).

No se toca ningún template ni el gate de CI (los slugs se derivan del
registro). `clients/example` (`unlisted`) existe para que CI pruebe
exactamente eso: se genera y sirve por URL directa, pero no se lista.

## Tests

- `npm test` — vitest: registro/parametrización, render de páginas (noindex,
  entry copy, badge con sha real, no hay slug hardcodeado), drift de
  `clients/` y `public/agent/`, contratos del manifest, ejecución de tools,
  verify de provenance (detecta divergencia inyectada), matcher Fit con la JD
  de Blacksmith (MCP/agentes/Node matchean; LangChain/SDK Anthropic son gaps),
  chat-context ≤ 6k tokens sin datos privados.
- `npm run test:agents` — `node --test`: protocolo MCP y Worker de chat
  (ok, cascada 429→fallback, input inválido, kill switch, CORS, rate limit,
  budget, modo JSON, prompt injection: el contexto siempre sale del servidor).
- CI verifica además que `dist/clients/<slug>/index.html` exista con noindex y
  bundle lab, que `dist/agent/*.json` sea idéntico a `public/agent/`, y
  `npm run clients:smoke` carga cada `dist/clients/<slug>/` en Chrome headless
  (HTTP loopback) y afirma que el bundle arranca: gate → lab, tools ejecutan
  JSON real, Verify 3/3 OK, Fit N/M, chat degrada sin endpoint.

## No-goals (v1)

Sin key en el cliente, sin proxy abierto, sin datos privados en el contexto, sin
fingir LangChain/Anthropic/streaming si no está en el código, la home no se
convierte en landing (ruta aparte + noindex), sin auth/password (área pública no
indexada; Cloudflare Access sería una fase posterior).
