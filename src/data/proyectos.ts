/**
 * PROYECTOS — catálogo editorial del museo, separado por ETAPA.
 *
 * La división de salas NO se decide a mano en el HTML: se deriva de `etapa`.
 *   · `publicado`  = existe un artefacto que un tercero puede inspeccionar sin
 *     pedir permiso (repositorio público con licencia y release, DOI, o URL viva).
 *     Es el mismo criterio que el SSOT de profile-data deriva con
 *     `projects[].artifactRefs` (profile-as-code#333), no una etiqueta escrita acá.
 *   · `desarrollo` = todavía no hay artefacto público; su ficha declara `falta`,
 *     es decir qué la haría graduarse a El Marco.
 *
 * `html` es la tarjeta sin la envoltura de scroll/delay: el renderer
 * (`tarjetas()` en sala_html) añade `data-scroll`/`data-delay` y, en El Bastidor,
 * la línea de graduación. El copy se conserva byte-idéntico porque las claves del
 * diccionario i18n son el texto ES exacto.
 */

export type Etapa = "publicado" | "desarrollo";

export interface Proyecto {
  id: string;
  /** Nombre para lectores de pantalla y tests; la tarjeta lleva su propio <em>. */
  nombre: string;
  etapa: Etapa;
  /** Qué le falta para pasar a El Marco (solo `desarrollo`). */
  falta?: string;
  /** HTML interno de la tarjeta (.project-status + título + copy). */
  html: string;
}

export const PROYECTOS: readonly Proyecto[] = [
  {
    id: "kontablo",
    nombre: "Kontablo",
    etapa: "publicado",
    html: `      <span class="project-status status-active">Publicado · v0.1.0 · Open-source</span>
      <div class="project-title"><em>Kontablo</em> — Ontología Contable Universal</div>
      <div class="project-tagline">Un Esperanto para la contabilidad: ontología basada en grafos que mapea las 195 jurisdicciones soberanas a IFRS/XBRL y a la economía agéntica (MCP · A2A · AP2)</div>
      <ul class="project-body">
        <li>Un UUID inamovible por cada concepto contable universal — los códigos son etiquetas visuales; el UUID es la identidad canónica</li>
        <li>195 jurisdicciones soberanas mapeadas; 60 overlays de planes de cuentas estatutarios (56 ejercidos contra fuentes primarias)</li>
        <li><em>Deterministic Boundary Library</em>: un agente no puede proponer un UUID que no exista en el grafo — elimina la clase clásica de alucinación contable a nivel del harness</li>
        <li>Capa agent-native para la economía agéntica; resolución determinista en tres niveles, con inteligencia sintética estocástica solo como último recurso</li>
      </ul>
      <div class="project-note">
        Publicado en junio 2026 bajo Business Source License 1.1 (convierte a Apache 2.0 en 2030). Preprint (aún no arbitrado) depositado en Zenodo y SSRN.<br>
        <a class="pub-doi" href="https://github.com/ChristianLuciani/accounting-esperanto" target="_blank">↗ Repositorio</a>
        <a class="pub-doi" href="https://doi.org/10.5281/zenodo.20738795" target="_blank">↗ Zenodo DOI 10.5281/zenodo.20738795</a>
        <a class="pub-doi" href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6960598" target="_blank">↗ SSRN 6960598</a>
        <a class="pub-doi" href="https://www.researchgate.net/publication/407549570_Kontablo_A_Graph-Based_Universal_Accounting_Ontology_for_the_M2M_Agentic_Economy" target="_blank">↗ ResearchGate</a>
      </div>`
  },
  {
    id: "drahma",
    nombre: "Drahma",
    etapa: "publicado",
    html: `      <span class="project-status status-active">Publicado · Agosto 2024 · Repositorio público</span>
      <div class="project-title"><em>Drahma</em> — Inteligencia Sintética Educativa</div>
      <div class="project-tagline">36 tutores virtuales socráticos para el currículo ecuatoriano, probados en campo amazónico (agosto 2024).</div>`
  },
  {
    id: "profile-as-code",
    nombre: "profile-as-code",
    etapa: "publicado",
    html: `      <span class="project-status status-active">Publicado · MIT · v0.3.6</span>
      <div class="project-title"><em>profile-as-code</em> — Motor de perfil spec-first</div>
      <div class="project-tagline">Una sola fuente de verdad versionable compila a todas las superficies públicas del perfil: renderers por plataforma, salida determinista y hechos validados por schema</div>
      <ul class="project-body">
        <li>El perfil no se edita a mano en cada plataforma: cada artefacto es función pura del SSOT (YAML + JSON Schema v1.13)</li>
        <li>Contrato especificado antes del código (D1–D22), con gates de CI sobre schema, inventario de paquetes y links de documentación</li>
        <li>Ledger de deploy por entrada: qué está publicado, dónde, y si quedó stale. Este CV consume la misma fuente</li>
        <li>El README de perfil de GitHub que publico es su output</li>
      </ul>
      <div class="project-note">
        Publicado bajo licencia MIT, con releases etiquetados.<br>
        <a class="pub-doi" href="https://github.com/ChristianLuciani/profile-as-code" target="_blank">↗ Repositorio</a>
      </div>`
  },
  {
    id: "zentropy",
    nombre: "ZENTROPY",
    etapa: "desarrollo",
    falta: "repositorio público con licencia y release — el schema, la ingesta y la arquitectura multi-tenant ya existen.",
    html: `      <span class="project-status status-private">Prototipo · Sin artefacto público</span>
      <div class="project-title"><em>ZENTROPY</em> — Zero Entropy Intelligence Station</div>
      <div class="project-tagline">Sistema operativo cognitivo personal — captura, destila y organiza conversaciones con cognición sintética</div>
      <ul class="project-body">
        <li>Resuelve la entropía dialéctica: cada conversación con cognición sintética produce destellos de claridad que desaparecen. ZENTROPY los captura en base de datos estructurada (Supabase, schema <em>zentropia</em>)</li>
        <li>Ingesta universal: Claude JSON/ZIP, ChatGPT, Markdown — parser propio (<code>ingest.py</code>)</li>
        <li>Módulo central del ecosistema de cognición sintética: integra con CLAPPS, UCVE, NOOS, Kontablo</li>
        <li>Arquitectura multi-tenant lista para uso público. Stage 2: Open WebUI local con OpenRouter</li>
      </ul>
      <div class="project-note">La abundancia de herramientas cognitivas sin arquitectura es la forma más sofisticada de entropía.</div>`
  },
  {
    id: "estelectica",
    nombre: "Estel\u00e9ctica",
    etapa: "desarrollo",
    falta: "el paper (es candidata a publicación académica); el repositorio es privado.",
    html: `      <span class="project-status status-private">Investigación activa</span>
      <div class="project-title"><em>Esteléctica</em> — Epistemología del Diálogo Poli-dialéctico Destilado</div>
      <div class="project-tagline">Propuesta filosófica sobre la naturaleza del conocimiento colectivo en la era de la cognición sintética</div>
      <ul class="project-body">
        <li>Problema: toda conversación prolongada tiende hacia el ruido. El diálogo con cognición sintética lo acelera — la ventana de contexto se degrada, las sesiones no persisten</li>
        <li>Propuesta: modelo <strong>Tronco/Rizoma</strong> — el rizoma explora libremente; periódicamente el par humano-cognición sintética destila hacia el Tronco (conocimiento estable)</li>
        <li>Doble naturaleza: propuesta filosófica <em>y</em> arquitectura de software para gestión epistemológica</li>
        <li>Integra Noesis y Noetix — taxonomía de perspectivas de pensamiento y su motor agéntico, como material de la epistemología del diálogo</li>
      </ul>
      <div class="project-note">Candidata a publicación académica.</div>`
  },
  {
    id: "clapps",
    nombre: "CLAPPS.AI",
    etapa: "desarrollo",
    falta: "primer contenido real (Noesis y Noetix) y una versión navegable.",
    html: `      <span class="project-status status-private">Concepto activo</span>
      <div class="project-title"><em>CLAPPS.AI</em> — Learning Applications Platform</div>
      <div class="project-tagline">Plataforma de desarrollo humano autodidacta — contrapunto al modelo LMS tradicional</div>
      <ul class="project-body">
        <li>Los LMS (Learning Management Systems) son en realidad plataformas de <em>registro y control de enseñanza</em>: tracking de evaluación, entrega de contenidos, pensados para el sistema educativo tradicional — no para el aprendizaje real</li>
        <li>CLAPPS propone un soporte estructurado y dinámico para el desarrollo de habilidades a largo plazo, no solo entrega de contenido de alta calidad</li>
        <li>Referente más cercano actual: NotebookLM — pero limitado a diversidad de material sobre un tema, sin sistema de progresión estructurada para el desarrollo de competencias</li>
        <li>Primer contenido real: Noesis y Noetix — el mapa de perspectivas cognitivas y su motor de agentes compuestos</li>
      </ul>`
  },
  {
    id: "noos",
    nombre: "NOOS",
    etapa: "desarrollo",
    falta: "el marco conceptual como publicación; hoy es investigación privada.",
    html: `      <span class="project-status status-private">Investigación privada</span>
      <div class="project-title"><em>NOOS</em> — Natural Organization Operating System</div>
      <div class="project-tagline">Reducir la entropía organizacional mediante inteligencia sintética distribuida y grafos de conocimiento</div>
      <ul class="project-body">
        <li>Marco conceptual que aplica teoría de sistemas complejos al diseño organizacional</li>
        <li>Propuesta: las organizaciones pueden modelarse como sistemas termodinámicos con estados de alta/baja entropía</li>
        <li>Arquitectura: inteligencia sintética distribuida + bases de datos en grafo para mapear flujos de decisión y conocimiento tácito</li>
        <li>Destino: consultoría de alto valor para organizaciones en transición digital</li>
      </ul>
      <div class="project-note">Investigación en curso. Publicación académica planificada.</div>`
  },
  {
    id: "topia",
    nombre: "Topia",
    etapa: "desarrollo",
    falta: "el primer número publicado.",
    html: `      <span class="project-status status-private">En diseño</span>
      <div class="project-title"><em>Topia</em> — Motor editorial de newsletter</div>
      <div class="project-tagline">De la distopía a eutopías alcanzables: un ensayo a la vez, cada claim con fuente, cada tesis falsable</div>
      <ul class="project-body">
        <li>El rigor epistémico como formato editorial: trazabilidad de fuentes y falsabilidad de cada tesis</li>
        <li>Mapea el camino a la soberanía tecnológica, la cognición colectiva y las economías regenerativas</li>
      </ul>`
  },
  {
    id: "nelson-companion",
    nombre: "Nelson Companion",
    etapa: "desarrollo",
    falta: "repositorio público y licencia — el uso ya es real.",
    html: `      <span class="project-status status-private">En uso · Sin artefacto público</span>
      <div class="project-title"><em>Nelson Companion</em> — PWA de voz asistida</div>
      <div class="project-tagline">PWA guiada por voz para mi padre (76, afasia post-ACV): offline-first, cero telemetría</div>
      <ul class="project-body">
        <li>Uso real y diario: el usuario objetivo es el usuario real</li>
        <li>Offline-first y sin telemetría — la accesibilidad no puede depender de una conexión ni de un servidor ajeno</li>
      </ul>`
  },
  {
    id: "physics-lab-book",
    nombre: "Physics Lab Book",
    etapa: "desarrollo",
    falta: "repositorio público (hoy privado); las 36 guías y su uso en USFQ ya existen.",
    html: `      <span class="project-status status-paused">En uso · Repositorio privado</span>
      <div class="project-title"><em>Physics Lab Book</em> — Laboratorio de física interactivo</div>
      <div class="project-tagline">36 guías interactivas HTML5 de laboratorio de física universitaria, originalmente escritas para USFQ</div>
      <ul class="project-body">
        <li>800+ estudiantes anuales en USFQ</li>
        <li>36 guías originales: ingenierías, ciencias de la salud y ciencias puras</li>
      </ul>`
  }
];

/** Obra publicada y auditable: lo que El Marco puede colgar. */
export const publicados = PROYECTOS.filter((p) => p.etapa === "publicado");

/** En desarrollo: prototipos, investigaciones e ideas, cada uno con su `falta`. */
export const enDesarrollo = PROYECTOS.filter((p) => p.etapa === "desarrollo");
