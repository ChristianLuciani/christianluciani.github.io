/**
 * Render de las páginas `/clients/<slug>/` (#145). Puro y sin I/O: recibe un
 * ClientLab y devuelve el documento completo. `tools/build-clients.ts` lo
 * escribe a disco (fuente commiteada y artefacto dist). Ningún slug está
 * hardcodeado acá: todo viene del config del cliente.
 *
 * Contrato del entry (igual que SOURCE_ENTRY del sitio): el modo fuente
 * referencia `/src/client/main.ts`; el modo artefacto lo reemplaza por el
 * bundle hasheado que deja `vite build --manifest`.
 */
import { CLIENTS, clientSlugs, type ClientLab } from "../content/clients/index.ts";
import { siteManifest, SITE_PROFILE } from "../agent/site.ts";
import { currentRoleEn } from "../agent/verify.ts";
import { PROFILE_COMMIT, PROFILE_ENGINE, ENGINE_URL } from "../data/profile.provenance.ts";
import { labT, type LabLocale } from "../client/i18n.ts";

export const CLIENT_SOURCE_ENTRY = `<script type="module" crossorigin src="/src/client/main.ts"></script>`;

const PROFILE_DATA = SITE_PROFILE;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** JSON embebido en <script type="application/json"> sin romper el tag. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

interface LabConfig {
  slug: string;
  brand: string;
  role: string;
  locale: LabLocale;
  jd: string;
  modules: readonly string[];
  chat: { enabled: boolean; endpoint: string; suggested: { en: string; es?: string }[] };
  accent: string;
}

function labConfig(client: ClientLab): LabConfig {
  return {
    slug: client.slug,
    brand: client.brand,
    role: client.role,
    locale: client.locale,
    jd: client.jd,
    modules: [...client.modules],
    chat: {
      enabled: client.chat.enabled,
      endpoint: client.chat.endpoint ?? "",
      suggested: client.chat.suggested.map((q) => ({ en: q.en, es: q.es }))
    },
    accent: client.theme.accent
  };
}

/** Hechos que el módulo Provenance compara contra profile.json servido. */
function verifyFacts(): { name: string; lastRole: string; project: string } {
  const published = PROFILE_DATA.projects.find((p) => p.published);
  return {
    name: PROFILE_DATA.identity.name,
    // Rol VIGENTE por la regla de recencia del repo (present = futuro), no experience[0].
    lastRole: currentRoleEn(PROFILE_DATA),
    project: published?.name ?? PROFILE_DATA.projects[0]?.name ?? ""
  };
}

function provenanceBadge(locale: LabLocale): string {
  const engine = PROFILE_ENGINE.version ? ` · pasco ${PROFILE_ENGINE.version}` : "";
  const schema = PROFILE_ENGINE.schema ? ` · schema v${PROFILE_ENGINE.schema}` : "";
  const generated = PROFILE_DATA.source.commitDate ?? PROFILE_DATA.source.generatedAt ?? "";
  return `${labT(locale, "foot.generated")} profile-data @ <code>${PROFILE_COMMIT}</code>${engine}${schema}${generated ? ` · ${generated}` : ""}`;
}

function agentModuleHtml(client: ClientLab): string {
  const locale = client.locale;
  const tools = siteManifest().tools
    .map((tool) => {
      const example =
        tool.name === "get_project"
          ? `{ "name": "kontablo" }`
          : tool.name === "search_publications"
            ? `{ "query": "accounting" }`
            : tool.name === "list_projects"
              ? `{ "published": true }`
              : `{}`;
      return `    <article class="tool-card" data-tool="${escapeAttr(tool.name)}" data-endpoint="${escapeAttr(tool.endpoint)}">
      <h4>${escapeHtml(tool.name)}</h4>
      <p>${escapeHtml(tool.description)}</p>
      <details><summary>inputSchema</summary><pre>${escapeHtml(JSON.stringify(tool.inputSchema, null, 2))}</pre></details>
      <label>input JSON<textarea class="tool-input" rows="2" spellcheck="false">${escapeHtml(example)}</textarea></label>
      <button type="button" class="tool-run" data-i18n="mod.agent.run">${escapeHtml(labT(locale, "mod.agent.run"))}</button>
      <div class="tool-out" hidden>
        <p class="tool-out-label" data-i18n="mod.agent.request">${escapeHtml(labT(locale, "mod.agent.request"))}</p>
        <pre class="tool-req"></pre>
        <p class="tool-out-label" data-i18n="mod.agent.response">${escapeHtml(labT(locale, "mod.agent.response"))}</p>
        <pre class="tool-res"></pre>
      </div>
    </article>`;
    })
    .join("\n");
  return `  <section class="lab-module" data-module="agent" aria-labelledby="mod-agent-title">
    <h3 id="mod-agent-title" data-i18n="mod.agent.title">${escapeHtml(labT(locale, "mod.agent.title"))}</h3>
    <p data-i18n="mod.agent.desc">${escapeHtml(labT(locale, "mod.agent.desc"))}</p>
    <p class="lab-note" data-i18n="mod.agent.note">${escapeHtml(labT(locale, "mod.agent.note"))}</p>
    <div class="tool-grid">
${tools}
    </div>
  </section>`;
}

function mcpModuleHtml(client: ClientLab): string {
  const locale = client.locale;
  const snippet = JSON.stringify(
    { mcpServers: { profile: { command: "node", args: ["mcp/server.mjs"] } } },
    null,
    2
  );
  const toolNames = siteManifest().tools.map((t) => t.name).join(", ");
  return `  <section class="lab-module" data-module="mcp" aria-labelledby="mod-mcp-title">
    <h3 id="mod-mcp-title" data-i18n="mod.mcp.title">${escapeHtml(labT(locale, "mod.mcp.title"))}</h3>
    <p data-i18n="mod.mcp.desc">${escapeHtml(labT(locale, "mod.mcp.desc"))}</p>
    <p class="lab-note"><span data-i18n="mod.mcp.tools">${escapeHtml(labT(locale, "mod.mcp.tools"))}</span> <code>${escapeHtml(toolNames)}</code> · <span data-i18n="mod.mcp.reads">${escapeHtml(labT(locale, "mod.mcp.reads"))}</span> <code>public/agent/*.json</code></p>
    <p data-i18n="mod.mcp.snippet">${escapeHtml(labT(locale, "mod.mcp.snippet"))}</p>
    <pre class="mcp-snippet" id="mcp-snippet">${escapeHtml(snippet)}</pre>
    <button type="button" id="mcp-copy" data-i18n="mod.mcp.copy">${escapeHtml(labT(locale, "mod.mcp.copy"))}</button>
  </section>`;
}

function fitModuleHtml(client: ClientLab): string {
  const locale = client.locale;
  return `  <section class="lab-module" data-module="fit" aria-labelledby="mod-fit-title">
    <h3 id="mod-fit-title" data-i18n="mod.fit.title">${escapeHtml(labT(locale, "mod.fit.title"))}</h3>
    <p data-i18n="mod.fit.desc">${escapeHtml(labT(locale, "mod.fit.desc"))}</p>
    <textarea id="fit-input" rows="5" spellcheck="false" data-i18n-ph="mod.fit.placeholder" placeholder="${escapeAttr(labT(locale, "mod.fit.placeholder"))}"></textarea>
    <div class="lab-actions">
      <button type="button" id="fit-preset" data-i18n="mod.fit.preset">${escapeHtml(labT(locale, "mod.fit.preset"))}</button>
      <button type="button" id="fit-run" class="primary" data-i18n="mod.fit.run">${escapeHtml(labT(locale, "mod.fit.run"))}</button>
    </div>
    <p id="fit-summary" class="lab-note" hidden></p>
    <ol id="fit-output" class="fit-output"></ol>
  </section>`;
}

function provenanceModuleHtml(client: ClientLab): string {
  const locale = client.locale;
  return `  <section class="lab-module" data-module="provenance" aria-labelledby="mod-provenance-title">
    <h3 id="mod-provenance-title" data-i18n="mod.provenance.title">${escapeHtml(labT(locale, "mod.provenance.title"))}</h3>
    <p data-i18n="mod.provenance.desc">${escapeHtml(labT(locale, "mod.provenance.desc"))}</p>
    <button type="button" id="prov-verify" data-i18n="mod.provenance.verify">${escapeHtml(labT(locale, "mod.provenance.verify"))}</button>
    <ul id="prov-results" class="prov-results"></ul>
  </section>`;
}

function chatModuleHtml(client: ClientLab): string {
  const locale = client.locale;
  if (!client.chat.enabled) {
    return `  <section class="lab-module" data-module="chat" aria-labelledby="mod-chat-title">
    <h3 id="mod-chat-title" data-i18n="mod.chat.title">${escapeHtml(labT(locale, "mod.chat.title"))}</h3>
    <p class="lab-note" data-i18n="mod.chat.unavailable">${escapeHtml(labT(locale, "mod.chat.unavailable"))}</p>
  </section>`;
  }
  const suggested = client.chat.suggested
    .map((q) => {
      const shown = locale === "es" ? q.es ?? q.en : q.en;
      return `      <button type="button" class="chat-suggested" data-es="${escapeAttr(q.es ?? q.en)}" data-en="${escapeAttr(q.en)}">${escapeHtml(shown)}</button>`;
    })
    .join("\n");
  return `  <section class="lab-module" data-module="chat" aria-labelledby="mod-chat-title">
    <h3 id="mod-chat-title" data-i18n="mod.chat.title">${escapeHtml(labT(locale, "mod.chat.title"))}</h3>
    <p data-i18n="mod.chat.desc">${escapeHtml(labT(locale, "mod.chat.desc"))}</p>
    <p class="lab-note" data-i18n="mod.chat.disclaimer">${escapeHtml(labT(locale, "mod.chat.disclaimer"))}</p>
    <div id="chat-messages" class="chat-messages" aria-live="polite"></div>
    <div id="chat-suggested" class="chat-suggested">
${suggested}
    </div>
    <div class="chat-input-row">
      <input id="chat-input" type="text" maxlength="300" data-i18n-ph="mod.chat.placeholder" placeholder="${escapeAttr(labT(locale, "mod.chat.placeholder"))}">
      <button type="button" id="chat-send" class="primary" data-i18n="mod.chat.send">${escapeHtml(labT(locale, "mod.chat.send"))}</button>
    </div>
  </section>`;
}

const MODULE_RENDERERS: Record<string, (client: ClientLab) => string> = {
  agent: agentModuleHtml,
  mcp: mcpModuleHtml,
  fit: fitModuleHtml,
  provenance: provenanceModuleHtml,
  chat: chatModuleHtml
};

function labCss(): string {
  return `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:#0c1016; color:#e8edf4; font:15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
code, pre, textarea, input { font:13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
a { color:var(--lab-accent, #00c9c0); }
button { font:inherit; cursor:pointer; border:1px solid #2a3342; background:#141a24; color:#e8edf4; border-radius:8px; padding:8px 14px; }
button:hover { border-color:var(--lab-accent, #00c9c0); }
button.primary { background:var(--lab-accent, #00c9c0); border-color:transparent; color:#0c1016; font-weight:600; }
#lab-gate { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:14px; padding:24px; max-width:720px; margin:0 auto; animation:lab-gate-in .45s ease-out both; }
@keyframes lab-gate-in { from { opacity:0; transform:translateY(8px); } }
.gate-eyebrow { color:var(--lab-accent, #00c9c0); letter-spacing:.14em; text-transform:uppercase; font-size:12px; margin:0; }
#lab-gate h1 { font-size:clamp(28px, 5vw, 44px); margin:0; }
.gate-lead { color:#aeb9c8; max-width:60ch; margin:0; }
.gate-note { color:#6b7686; font-size:13px; max-width:52ch; }
#lab-enter { font-size:16px; padding:12px 22px; background:var(--lab-accent, #00c9c0); color:#0c1016; border:none; font-weight:600; }
#lab { max-width:960px; margin:0 auto; padding:24px 16px 48px; }
.lab-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:1px solid #232b38; padding-bottom:16px; flex-wrap:wrap; }
.lab-brand { color:var(--lab-accent, #00c9c0); font-size:12px; letter-spacing:.12em; text-transform:uppercase; margin:0 0 4px; }
.lab-title { margin:0; font-size:26px; }
.lab-sub { color:#8b96a6; font-size:13px; margin:6px 0 0; }
.lab-head-side { display:flex; gap:10px; align-items:center; }
.lab-module { border:1px solid #232b38; border-radius:12px; padding:20px; margin-top:20px; background:#10151d; }
.lab-module h3 { margin:0 0 8px; font-size:19px; }
.lab-module p { color:#aeb9c8; }
.lab-note { color:#6b7686 !important; font-size:13px; }
.tool-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px; margin-top:12px; }
.tool-card { border:1px solid #232b38; border-radius:10px; padding:14px; background:#0d1219; }
.tool-card h4 { margin:0 0 6px; color:var(--lab-accent, #00c9c0); }
.tool-card details { margin:8px 0; } .tool-card summary { cursor:pointer; color:#8b96a6; font-size:12px; }
.tool-card pre, .mcp-snippet { background:#0a0e14; border:1px solid #1d2530; border-radius:8px; padding:10px; overflow:auto; white-space:pre-wrap; word-break:break-word; }
.tool-input { width:100%; background:#0a0e14; color:#e8edf4; border:1px solid #1d2530; border-radius:8px; padding:8px; }
.tool-run { margin-top:8px; }
.tool-out { margin-top:10px; } .tool-out-label { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#6b7686; margin:8px 0 4px; }
.tool-req, .tool-res { margin:0; } .tool-res { color:#9fe8d8; } .tool-res.tool-error { color:#ff9d7a; }
#fit-input { width:100%; background:#0a0e14; color:#e8edf4; border:1px solid #1d2530; border-radius:8px; padding:10px; }
.lab-actions { display:flex; gap:10px; margin:10px 0; }
.fit-output { margin:10px 0 0; padding-left:20px; } .fit-output li { margin-bottom:10px; }
.fit-status { font-size:11px; text-transform:uppercase; letter-spacing:.1em; padding:2px 8px; border-radius:99px; margin-right:8px; }
.fit-status.evidence { background:rgba(0,201,192,.12); color:#5ee6de; }
.fit-status.gap { background:rgba(255,122,26,.14); color:#ffb37a; }
.fit-evidence { margin:6px 0 0; padding-left:16px; color:#8b96a6; font-size:13px; }
.fit-evidence a { color:var(--lab-accent, #00c9c0); }
.prov-results { list-style:none; padding:0; margin:12px 0 0; }
.prov-results li { font-size:13px; margin-bottom:6px; }
.prov-badge-ok { color:#5ee6de; } .prov-badge-fail { color:#ff9d7a; font-weight:700; }
.chat-messages { display:flex; flex-direction:column; gap:8px; max-height:320px; overflow:auto; border:1px solid #1d2530; border-radius:8px; padding:10px; background:#0a0e14; margin-bottom:10px; }
.chat-msg { max-width:85%; padding:8px 12px; border-radius:10px; white-space:pre-wrap; }
.chat-msg.user { align-self:flex-end; background:#1c2634; }
.chat-msg.assistant { align-self:flex-start; background:#12202b; }
.chat-msg.system { align-self:center; color:#6b7686; font-size:12px; background:none; }
.chat-cites { margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; }
.chat-cite { font-size:11px; border:1px solid var(--lab-accent, #00c9c0); color:var(--lab-accent, #00c9c0); border-radius:99px; padding:1px 8px; }
.chat-suggested { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
.chat-suggested button { font-size:13px; padding:6px 10px; }
.chat-input-row { display:flex; gap:8px; }
#chat-input { flex:1; background:#0a0e14; color:#e8edf4; border:1px solid #1d2530; border-radius:8px; padding:8px 10px; }
.lab-foot { max-width:960px; margin:0 auto; padding:0 16px 40px; color:#6b7686; font-size:12px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.lab-foot code { color:#8b96a6; }
@media (max-width:640px) { .chat-msg { max-width:100%; } }
`;
}

/** Documento completo de `/clients/<slug>/`. */
export function clientPageHtml(client: ClientLab): string {
  const locale = client.locale;
  const facts = verifyFacts();
  const modules = client.modules
    .map((id) => MODULE_RENDERERS[id]?.(client) ?? "")
    .filter(Boolean)
    .join("\n");
  const title = `${client.brand} · ${client.role} — ${labT(locale, "lab.title")} · Christian Luciani`;
  const description = `${labT(locale, "lab.title")}: ${client.role} @ ${client.brand}.`;
  return `<!DOCTYPE html>
<html lang="${locale}" data-client="${escapeAttr(client.slug)}" style="--lab-accent:${escapeAttr(client.theme.accent)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon-aurea-teal.svg">
<style>${labCss()}</style>
${CLIENT_SOURCE_ENTRY}
</head>
<body>
<script type="application/json" id="lab-config">${embedJson(labConfig(client))}</script>

<section id="lab-gate" aria-labelledby="gate-title">
  <p class="gate-eyebrow" data-es="${escapeAttr(client.entry.eyebrow.es ?? client.entry.eyebrow.en)}" data-en="${escapeAttr(client.entry.eyebrow.en)}">${escapeHtml(locale === "es" ? client.entry.eyebrow.es ?? client.entry.eyebrow.en : client.entry.eyebrow.en)}</p>
  <h1 id="gate-title" data-es="${escapeAttr(client.entry.title.es ?? client.entry.title.en)}" data-en="${escapeAttr(client.entry.title.en)}">${escapeHtml(locale === "es" ? client.entry.title.es ?? client.entry.title.en : client.entry.title.en)}</h1>
  <p class="gate-lead" data-es="${escapeAttr(client.entry.lead.es ?? client.entry.lead.en)}" data-en="${escapeAttr(client.entry.lead.en)}">${escapeHtml(locale === "es" ? client.entry.lead.es ?? client.entry.lead.en : client.entry.lead.en)}</p>
  <p class="gate-note">${escapeHtml(labT(locale, "gate.note"))}</p>
  <button id="lab-enter" type="button" data-es="${escapeAttr(client.entry.cta.es ?? client.entry.cta.en)}" data-en="${escapeAttr(client.entry.cta.en)}">${escapeHtml(locale === "es" ? client.entry.cta.es ?? client.entry.cta.en : client.entry.cta.en)}</button>
</section>

<main id="lab" hidden>
  <header class="lab-head">
    <div>
      <p class="lab-brand">${escapeHtml(client.brand)} · ${escapeHtml(client.role)}</p>
      <h2 class="lab-title" data-i18n="lab.title">${escapeHtml(labT(locale, "lab.title"))}</h2>
      <p class="lab-sub"><span data-verify="name">${escapeHtml(facts.name)}</span> · <span data-verify="lastRole">${escapeHtml(facts.lastRole)}</span> · <span data-verify="project">${escapeHtml(facts.project)}</span></p>
    </div>
    <div class="lab-head-side">
      <a href="/" data-i18n="lab.home">${escapeHtml(labT(locale, "lab.home"))}</a>
      <button id="lab-lang" type="button">${locale === "es" ? "EN" : "ES"}</button>
    </div>
  </header>
${modules}
</main>

<footer class="lab-foot">
  <span class="lab-provenance" id="lab-provenance">${provenanceBadge(locale)}</span>
  <a href="${ENGINE_URL}" target="_blank" rel="noopener">profile-as-code</a>
</footer>

</body>
</html>
`;
}

/** `/clients/` — índice discreto de laboratorios públicos (también noindex). Los `unlisted` no se listan. */
export function clientsIndexHtml(): string {
  const items = clientSlugs()
    .filter((slug) => !CLIENTS[slug].unlisted)
    .map((slug) => {
      const client = CLIENTS[slug];
      return `    <li><a href="/clients/${escapeAttr(slug)}/">${escapeHtml(client.brand)}</a> — ${escapeHtml(client.role)}</li>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Client labs · Christian Luciani</title>
<style>${labCss()}</style>
</head>
<body>
<main id="lab">
  <header class="lab-head">
    <div>
      <p class="lab-brand">Christian Luciani</p>
      <h2 class="lab-title">Client labs</h2>
      <p class="lab-sub">Prepared areas for specific hiring teams. Public but not indexed.</p>
    </div>
    <div class="lab-head-side"><a href="/">christianluciani.github.io</a></div>
  </header>
  <section class="lab-module">
    <ul>
${items}
    </ul>
  </section>
</main>
<footer class="lab-foot">
  <span class="lab-provenance">${provenanceBadge("en")}</span>
</footer>
</body>
</html>
`;
}
