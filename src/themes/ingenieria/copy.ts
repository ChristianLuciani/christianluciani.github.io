/**
 * PACK DE COPY — tema `ingenieria` (SPEC §8 FASE 5.7 · ADR-001).
 *
 * QUÉ ES: el texto VISIBLE de la CAPA DE PRESENTACIÓN del tema, con ES + EN
 * completos. Los renderers (`src/templates/**`) no contienen literales: piden
 * estas claves con `t()` (`src/content/copy.ts`). Este pack parte del de `museo` y reescribe la VOZ para
 * una audiencia de ingeniería (sistemas, contratos, operación); el contenido
 * factual —publicaciones, formación, contacto, credenciales— se mantiene.
 *
 * QUÉ NO ES el SSOT. Nombres propios, fechas, orgs, publicaciones y links son
 * hechos: su fuente canónica es `profile-data` (`publications.yaml`,
 * `projects.yaml`, …) y este pack sólo declara su PRESENTACIÓN. Mientras esa
 * proyección no exista (#99/#128), los títulos y leyendas de la Biblioteca —y
 * los `headline` del JSON-LD que salen de las mismas claves— se leen de acá
 * como ÚNICA superficie de render: si el hecho cambia, hay que actualizar el
 * pack Y el SSOT. Esa deuda está declarada, no escondida: cuando la proyección
 * llegue, estas claves se derivan del SSOT y el pack queda sólo con la voz.
 *
 * El tema NO se hardcodea en los templates: `src/content/copy.ts` resuelve el
 * pack de la narrativa activa (`THEMES`).
 */
import type { CopyPack } from "../types.ts";

export const INGENIERIA_COPY: CopyPack = {
  /* ── HERO · entrada del museo ───────────────────────────────── */
  "hero.label": { es: "Ingeniería de Sistemas · 2026", en: "Systems Engineering · 2026" },
  "hero.tagline": {
    es: "Arquitecturas · Agentes · Ontologías",
    en: "Architectures · Agents · Ontologies"
  },
  "hero.scroll": { es: "DESPLAZAR PARA RECORRER", en: "SCROLL TO EXPLORE" },
  "hero.metric.jurisdictions": { es: "jurisdicciones", en: "jurisdictions" },
  "hero.metric.tutors": { es: "tutores", en: "tutors" },
  "hero.metric.years": { es: "años", en: "years" },

  /* ── ARIA · labels de canvas (se leen, no se ven: copy igual) ── */
  "hero.aria.canvas": { es: "Cubos isométricos pulsantes", en: "Pulsating isometric cubes" },
  "room.perfil.aria.necker": { es: "Cuadrícula de cubo de Necker", en: "Necker cube grid" },
  "room.proyectos.aria.fractal": {
    es: "Campo fractal tipo Mandelbrot",
    en: "Mandelbrot-like fractal field"
  },
  "room.experiencia.aria.interference": {
    es: "Patrón de interferencia de doble fuente",
    en: "Double-source interference pattern"
  },
  "room.fisica.aria.snakes": {
    es: "Ilusión de serpientes rotantes",
    en: "Rotating snakes illusion"
  },
  "room.competencias.aria.sierpinski": {
    es: "Triángulo de Sierpinski",
    en: "Sierpinski triangle"
  },
  "room.fisica.aria.penrose": {
    es: "Triángulo de Penrose pulsante",
    en: "Pulsating Penrose triangle"
  },

  /* ── ALT · miniaturas de publicaciones (accesibilidad) ─────── */
  "pub.kontablo.alt": { es: "Kontablo preprint 2026", en: "Kontablo preprint 2026" },
  "pub.caffeine.alt": { es: "Carbon Trends 2025", en: "Carbon Trends 2025" },
  "pub.dielectric.alt": { es: "ChemPhysChem 2025", en: "ChemPhysChem 2025" },
  "pub.guias.alt": { es: "USFQ 2019-2024", en: "USFQ 2019-2024" },
  "pub.cellulose.alt": { es: "Heliyon 2023", en: "Heliyon 2023" },
  "pub.hydrochars.alt": {
    es: "ResearchGate preprint 2023",
    en: "ResearchGate preprint 2023"
  },
  "pub.microcrystalline.alt": { es: "SSRN 2022", en: "SSRN 2022" },
  "pub.ivory.alt": { es: "AIChE Annual Meeting 2022", en: "AIChE Annual Meeting 2022" },
  "pub.neural.alt": {
    es: "Condensed Matter Physics 2006",
    en: "Condensed Matter Physics 2006"
  },
  "pub.balancing.alt": {
    es: "Prog. Theor. Phys. 2006",
    en: "Prog. Theor. Phys. 2006"
  },

  /* ── COVER · HUD, descarga, loader ──────────────────────────── */
  "cover.brandAria": {
    es: "Christian Luciani — ir a la entrada",
    en: "Christian Luciani — go to the entrance"
  },
  "cover.navAria": { es: "Salas del sistema", en: "System rooms" },
  "cover.langAria": {
    es: "Switch language / Cambiar idioma",
    en: "Switch language / Cambiar idioma"
  },
  "cover.soundAria": { es: "Silenciar sonido de fondo", en: "Mute background sound" },
  "cover.soundAriaOff": {
    es: "Activar sonido de fondo",
    en: "Enable background sound",
    runtime: true
  },
  "cover.soundTitle": { es: "Sonido: canto de ballenas", en: "Sound: whale song" },
  "cover.download": { es: "↓ Descargar CV", en: "↓ Download CV" },
  "cover.downloadAria": { es: "Descargar CV en PDF", en: "Download CV as PDF" },
  "cover.logoAria": {
    es: "Abrir el Laboratorio temporal del Espirángulo",
    en: "Open the Espirángulo temporary Lab"
  },
  "cover.logoTitle": {
    es: "Espirángulo · Laboratorio temporal",
    en: "Espirángulo · Temporary Lab"
  },
  "cover.skipIntro": { es: "Saltar intro", en: "Skip intro" },
  "cover.skipToContent": { es: "Ir al contenido", en: "Go to content" },
  "cover.skipAria": {
    es: "Saltar intro e ir directo a la página",
    en: "Skip intro and go straight to the page"
  },
  "cover.introPlaceholder": { es: "Diseño Sistemas Ontologías", en: "Design Systems Ontologies" },

  /* ── INTRO · frases montadas por `src/cv/intro.ts` ──────────── */
  "intro.phrase1": { es: "Diseño de Sistemas", en: "Systems Design", runtime: true },
  "intro.phrase2": {
    es: "Ingeniería del Conocimiento",
    en: "Knowledge Engineering",
    runtime: true
  },
  "intro.phrase3": { es: "Una Instancia Humana", en: "A Human Instance", runtime: true },

  /* ── PLANO · blueprint navegable ────────────────────────────── */
  "plano.title.word": { es: "Mapa", en: "System" },
  "plano.title.rest": { es: "del Sistema", en: "Map" },
  "plano.hint": {
    es: "MAPA DEL SISTEMA · ÍNDICE — HAZ CLIC EN UN MÓDULO PARA ENTRAR",
    en: "SYSTEM MAP · INDEX — CLICK A MODULE TO ENTER"
  },
  "plano.aria": { es: "Mapa del sistema", en: "System map" },
  "plano.sala": { es: "MÓDULO", en: "MODULE" },
  "plano.entry": { es: "ENTRADA", en: "ENTRANCE" },

  /* ── AHORA · chrome del feed now/v1 (#117) ──────────────────── */
  "now.title": { es: "En curso", en: "In progress" },
  "now.updated": { es: "Actualizado", en: "Updated" },
  "now.empty": { es: "Nada en ejecución.", en: "Nothing running.", runtime: true },

  /* ── HERO · etiquetas cortas de métricas ─────────────────────── */
  "hero.metric.physics": { es: "Física", en: "Physics" },

  /* ── FRAGMENTOS CON MARKUP ──────────────────────────────────────
     Un `label` con <em> se parte en DOS nodos de texto en el DOM (el walker
     traduce por nodo). El par del string completo no matchea ninguno; estos
     pares cubren los fragmentos (DRAHMA, celda «Fabricación Pedagógica»). */
  "room.proyectos.fabrication": { es: "Fabricación", en: "Fabrication" },
  "room.proyectos.pedagogical": { es: "Pedagógica", en: "Pedagogical" },

  /* ── SALA PERFIL ────────────────────────────────────────────── */
  "room.perfil.photoFallback": { es: "Añadir foto local", en: "Add local photo" },
  "room.perfil.drahmaLead": {
    es: "En 2024 diseñé e implementé",
    en: "In 2024 I designed and implemented"
  },
  "room.perfil.drahmaTail": {
    es: ": 36 tutores virtuales con inteligencia sintética y pedagogía socrática, alineados al currículo ecuatoriano, probados en campo con comunidades indígenas amazónicas.",
    en: ": 36 synthetic-intelligence virtual tutors with Socratic pedagogy, aligned to the Ecuadorian curriculum, field-tested with Amazonian indigenous communities."
  },
  "room.perfil.bilingual": {
    es: "Bilingüe funcional español-inglés (inglés intermedio). Redes activas en Panamá y Ecuador.",
    en: "Functionally bilingual Spanish-English (Intermediate English). Active networks in Panama and Ecuador."
  },
  "room.perfil.quote1": {
    es: "La física me enseñó a descomponer un sistema antes de optimizarlo.",
    en: "Physics taught me to decompose a system before optimizing it."
  },
  "room.perfil.quote2": {
    es: "El cine me enseñó a hacer que ese sistema funcione para otros.",
    en: "Film taught me to make that system work for others."
  },
  "room.perfil.illusionLabel": { es: "CUBO DE NECKER · 1832", en: "NECKER CUBE · 1832" },

  /* ── SALA FÍSICA (La Biblioteca) ────────────────────────────── */
  "room.fisica.quote": {
    es: '"Lo imposible solo lo es hasta que alguien lo dibuja correctamente."',
    en: '"The impossible is only impossible until someone draws it correctly."'
  },
  "room.fisica.illusionLabel": {
    es: "TRIÁNGULO DE PENROSE · 1954",
    en: "PENROSE TRIANGLE · 1954"
  },

  /* ── SALA GRAFO (El Compás) ─────────────────────────────────── */
  "room.grafo.lede": {
    es: "Dependencias, no sólo amplitud: qué sostiene qué en el sistema.",
    en: "Dependencies, not just breadth: what holds what in the system."
  },
  "room.grafo.teal": { es: "Teal", en: "Teal" },
  "room.grafo.published": { es: ", publicado · ", en: ", published · " },
  "room.grafo.grey": { es: "gris", en: "grey" },
  "room.grafo.development": { es: ", en desarrollo · ", en: ", in development · " },
  "room.grafo.gold": { es: "dorado", en: "golden" },
  "room.grafo.idea": { es: ", todavía una idea.", en: ", still an idea." },

  /* ── SALA GRAFO · labels de los nodos del canvas ─────────────── */
  "graph.node.ia": { es: "IA Sintética · Agentes", en: "Synthetic AI · Agents", runtime: true },
  "graph.node.soberania": {
    es: "Soberanía Tecnológica",
    en: "Technological Sovereignty",
    runtime: true
  },
  "graph.node.cognicion": { es: "Cognición · Filosofía", en: "Cognition · Philosophy", runtime: true },
  "graph.node.clapps": { es: "CLAPPS · Noesis/Noetix", en: "CLAPPS · Noesis/Noetix", runtime: true },
  "graph.node.noos": {
    es: "NOOS · Sistema Operativo Organizacional Natural",
    en: "NOOS · Natural Organization Operating System",
    runtime: true
  },
  "graph.node.profilereadme": { es: "Perfil GitHub", en: "GitHub Profile", runtime: true },
  "graph.node.internaltools": { es: "Aplicaciones Internas", en: "Internal Tools Gallery", runtime: true },

  /* ── SALA COMPETENCIAS (La Paleta) ──────────────────────────── */
  "room.competencias.interests": {
    es: "Escalada en roca · Montañismo · Cine asiático · Neurociencias ·\n        Consecuencias filosóficas de la cognición sintética post-humana · Nutrición · Meditación ·",
    en: "Rock climbing · Mountaineering · Asian cinema · Neuroscience · Philosophical consequences of post-human synthetic cognition · Nutrition · Meditation ·"
  },
  "room.competencias.interestsHighlight": {
    es: "La naturaleza cognitiva de los seres orgánicos en un mundo de cognición sintética.",
    en: "The cognitive nature of organic beings in a world of synthetic cognition."
  },

  /* ── SALA CONTACTO (El Buzón) ───────────────────────────────── */
  "room.contacto.illusionLabel": { es: "COPO DE KOCH · 1904", en: "KOCH SNOWFLAKE · 1904" },
  "room.contacto.note": {
    es: "Sistemas cognitivos y su interacción · emergencia de la inteligencia universal",
    en: "Cognitive systems and their interaction · emergence of universal intelligence"
  },

  /* ── SALA PROYECTOS · ilusión del showcase de Drahma ───────── */
  "room.proyectos.illusionStairs": {
    es: "ESCALERA DE PENROSE · 1958",
    en: "PENROSE STAIRS · 1958"
  },

  /* ── SALA PERFIL · períodos de formación (presentación, no hecho del SSOT) ── */
  "room.perfil.edu.audiovisual.period": { es: "2006 – 2008", en: "2006 – 2008" },
  "room.perfil.edu.doctoral.period": { es: "2003 – 2006", en: "2003 – 2006" },
  "room.perfil.edu.physics.period": { es: "1997 – 2003", en: "1997 – 2003" },
  "room.perfil.edu.cern.period": { es: "2003 · CERN · BECA", en: "2003 · CERN · SCHOLARSHIP" },

  /* ── PRINT · CV imprimible (las claves las consume `content/cv/print.ts`) ── */
  "print.sections.profile": { es: "Perfil", en: "Profile" },
  "print.sections.experience": { es: "Trayectoria técnica", en: "Technical trajectory" },
  "print.sections.experienceNote": {
    es: "Empleo, formación y talleres",
    en: "Employment, education and workshops"
  },
  "print.sections.professional": {
    es: "Experiencia profesional",
    en: "Professional experience"
  },
  "print.sections.training": { es: "Formación y talleres", en: "Education and workshops" },
  "print.sections.education": { es: "Formación académica", en: "Academic education" },
  "print.sections.publications": {
    es: "Publicaciones seleccionadas",
    en: "Selected publications"
  },
  "print.sections.skills": { es: "Competencias", en: "Skills" },
  "print.labels.present": { es: "PRESENTE", en: "PRESENT" },
  "print.labels.languages": { es: "Idiomas", en: "Languages" },
  "print.labels.footer": {
    es: "generado desde profile-data @",
    en: "generated from profile-data @"
  },
  "print.labels.footerNoDate": { es: "fecha no disponible", en: "date unavailable", runtime: true },
  "print.language.es": { es: "Español", en: "Spanish" },
  "print.language.en": { es: "Inglés", en: "English" },
  "print.language.fr": { es: "Francés", en: "French" },
  "print.level.native": { es: "nativo", en: "native" },
  "print.level.fluent": { es: "fluido", en: "fluent", runtime: true },
  "print.level.expert": { es: "experto", en: "expert" },
  "print.level.advanced": { es: "avanzado", en: "advanced" },
  "print.level.intermediate": { es: "intermedio", en: "intermediate" },
  "print.level.basic": { es: "básico", en: "basic", runtime: true },

  /* ── HEAD · metadata (title, description, tarjetas sociales) ───
     S5 las deriva de `narrative.meta`; hasta entonces son copy del tema y no
     viven en el template. */
  "meta.title": {
    es: "Christian Luciani — Ingeniería de Sistemas",
    en: "Christian Luciani — Systems Engineering"
  },
  "meta.description": {
    es: "Christian Luciani — Ingeniero de sistemas en Cuenca, Ecuador. Arquitecturas de software agéntico, ontologías contables y infraestructura soberana. Física, inteligencia sintética y docencia.",
    en: "Christian Luciani — Systems engineer in Cuenca, Ecuador. Agentic software architectures, accounting ontologies and sovereign infrastructure. Physics, synthetic intelligence and teaching."
  },
  "meta.ogTitle": {
    es: "Christian Luciani — Ingeniería de sistemas",
    en: "Christian Luciani — Systems engineering"
  },
  "meta.twitterDescription": {
    es: "Arquitecturas de software agéntico, ontologías contables e infraestructura soberana. Física, inteligencia sintética y docencia.",
    en: "Agentic software architectures, accounting ontologies and sovereign infrastructure. Physics, synthetic intelligence and teaching."
  },
  "meta.ogDescription": {
    es: "Arquitecto de software agéntico y ontologías contables. Ingeniero de sistemas en Cuenca, Ecuador.",
    en: "Agentic software architect and accounting ontologies. Systems engineer in Cuenca, Ecuador."
  },

  /* ── SALA FÍSICA · publicaciones ──────────────────────────────────
     DEUDA DECLARADA (#99/#128): la fuente canónica es
     `profile-data/publications.yaml`; la proyección al render todavía no
     existe. Hasta entonces este pack declara la PRESENTACIÓN (título, venue,
     alt) una sola vez para las dos superficies que hoy la consumen —la fila de
     la Biblioteca y el `headline` del JSON-LD—. No es el hecho: es su
     superficie de display mientras falta la proyección. */
  "pub.kontablo.title": {
    es: "Kontablo: A Graph-Based Universal Accounting Ontology for the M2M Agentic Economy",
    en: "Kontablo: A Graph-Based Universal Accounting Ontology for the M2M Agentic Economy"
  },
  "pub.kontablo.venue": {
    es: "Luciani, C. · Preprint (aún no arbitrado) · Zenodo & SSRN",
    en: "Luciani, C. · Preprint (not yet peer-reviewed) · Zenodo & SSRN"
  },
  "pub.kontablo.ssrn": { es: "↗ SSRN 6960598", en: "↗ SSRN 6960598" },
  "pub.caffeine.title": {
    es: "Highly efficient caffeine-based PVA composite film for UV shielding",
    en: "Highly efficient caffeine-based PVA composite film for UV shielding"
  },
  "pub.caffeine.venue": {
    es: "Trujillo Galarza et al. · Carbon Trends · Vol. 20, 100502",
    en: "Trujillo Galarza et al. · Carbon Trends · Vol. 20, 100502"
  },
  "pub.dielectric.title": {
    es: "Tunable Dielectric Carbon Materials from Hydrothermally Nanostructured Organic Carbon Sources",
    en: "Tunable Dielectric Carbon Materials from Hydrothermally Nanostructured Organic Carbon Sources"
  },
  "pub.dielectric.venue": {
    es: "Landázuri et al. · ChemPhysChem · 26, e202400711",
    en: "Landázuri et al. · ChemPhysChem · 26, e202400711"
  },
  "pub.guias.title": {
    es: "36 guías de prácticas de laboratorio de física",
    en: "36 physics laboratory practice guides"
  },
  "pub.guias.venue": {
    es: "USFQ · Ingeniería, Ciencias de la Salud, Ciencias Puras · Publicación institucional interna",
    en: "USFQ · Engineering, Health Sciences, Pure Sciences · Internal institutional publication"
  },
  "pub.cellulose.title": {
    es: "Optimization of microfibrillated cellulose isolation from cocoa pod husk via mild oxalic acid hydrolysis",
    en: "Optimization of microfibrillated cellulose isolation from cocoa pod husk via mild oxalic acid hydrolysis"
  },
  "pub.cellulose.venue": {
    es: "Zambrano et al. · Heliyon · 9, e17258",
    en: "Zambrano et al. · Heliyon · 9, e17258"
  },
  "pub.hydrochars.title": {
    es: "Hydrochars from Lignocellulosic Residues for Green Electronics, Environmental Remediation, Energy and Agricultural Applications",
    en: "Hydrochars from Lignocellulosic Residues for Green Electronics, Environmental Remediation, Energy and Agricultural Applications"
  },
  "pub.hydrochars.venue": {
    es: "Landázuri et al. · ResearchGate preprint",
    en: "Landázuri et al. · ResearchGate preprint"
  },
  "pub.microcrystalline.title": {
    es: "Optimization of Microcrystalline Cellulose Isolation from Cocoa Pod Husk via Mild Oxalic Acid Hydrolysis",
    en: "Optimization of Microcrystalline Cellulose Isolation from Cocoa Pod Husk via Mild Oxalic Acid Hydrolysis"
  },
  "pub.microcrystalline.venue": {
    es: "Zambrano et al. · SSRN Electronic Journal",
    en: "Zambrano et al. · SSRN Electronic Journal"
  },
  "pub.ivory.title": {
    es: "Ivory Nut (<em>Phytelephas equatorialis</em>) Residues: Chemical Composition for Applications in Health Care, Industry and Environmental Remediation — Towards Sustainability",
    en: "Ivory Nut (<em>Phytelephas equatorialis</em>) Residues: Chemical Composition for Applications in Health Care, Industry and Environmental Remediation — Towards Sustainability"
  },
  "pub.ivory.venue": {
    es: "Orejuela Escobar, Andrade, Luciani & Niebieskikwiat · 2022 AIChE Annual Meeting · Abstract",
    en: "Orejuela Escobar, Andrade, Luciani & Niebieskikwiat · 2022 AIChE Annual Meeting · Abstract"
  },
  "pub.ivory.link": { es: "↗ AIChE 2022 · Paper 649030", en: "↗ AIChE 2022 · Paper 649030" },
  "pub.neural.title": {
    es: "Neural control on multiple time scales: Insights from human stick balancing",
    en: "Neural control on multiple time scales: Insights from human stick balancing"
  },
  "pub.neural.venue": {
    es: "Cabrera, Luciani, Milton · Condensed Matter Physics · Vol. 9, No. 2",
    en: "Cabrera, Luciani, Milton · Condensed Matter Physics · Vol. 9, No. 2"
  },
  "pub.balancing.title": {
    es: "Balancing with Noise and Delay",
    en: "Balancing with Noise and Delay"
  },
  "pub.balancing.venue": {
    es: "Hosaka, Ohira, Luciani, Cabrera, Milton · Progress of Theoretical Physics Supplement · 161",
    en: "Hosaka, Ohira, Luciani, Cabrera, Milton · Progress of Theoretical Physics Supplement · 161"
  },

  /* ── SALA PERFIL · formación (curación; el SSOT no la proyecta aún) ── */
  "room.perfil.edu.audiovisual.title": {
    es: "Especialización en Audiovisuales",
    en: "Specialization in Audiovisual Media"
  },
  "room.perfil.edu.audiovisual.org": {
    es: "Escuela de Cine y TV, Caracas · Prix du Public FECOVEN 2008",
    en: "Film & TV School, Caracas · Prix du Public FECOVEN 2008"
  },
  "room.perfil.edu.doctoral.title": {
    es: "Candidatura Doctoral — Sistemas Complejos (ABD)",
    en: "Doctoral Candidacy — Complex Systems (ABD)"
  },
  "room.perfil.edu.doctoral.org": {
    es: "Universidad Simón Bolívar, Venezuela",
    en: "Universidad Simón Bolívar, Venezuela"
  },
  "room.perfil.edu.physics.title": { es: "Licenciatura en Física", en: "B.Sc. in Physics" },
  "room.perfil.edu.physics.org": {
    es: "Universidad Central de Venezuela · Tesis: Modelos Cosmológicos N-Dimensionales · SENESCYT: 862177536",
    en: "Universidad Central de Venezuela · Thesis: N-Dimensional Cosmological Models · SENESCYT: 862177536"
  },
  "room.perfil.edu.cern.title": {
    es: "II Latin American School of High Energy Physics",
    en: "2nd Latin American School of High Energy Physics"
  },
  "room.perfil.edu.cern.org": { es: "San Miguel Regla, México", en: "San Miguel Regla, Mexico" },

  /* ── SALA COMPETENCIAS · bloques ─────────────────────────────── */
  "room.competencias.agents.label": { es: "Código Sintético · Agentes", en: "Synthetic Code · Agents" },
  "room.competencias.agents.1": {
    es: "Orquestación de agentes y cognición sintética",
    en: "Agent orchestration and synthetic cognition"
  },
  "room.competencias.agents.2": {
    es: "Protocolos agénticos · MCP · ACP · A2A",
    en: "Agentic protocols · MCP · ACP · A2A"
  },
  "room.competencias.agents.3": {
    es: "Tutores socráticos · IA educativa (Drahma)",
    en: "Socratic tutors · Educational AI (Drahma)"
  },
  "room.competencias.agents.4": {
    es: "Ingeniería de contexto (RAG)",
    en: "Context engineering (RAG)"
  },
  "room.competencias.coding.label": { es: "Codificación Agéntica", en: "Agentic Coding" },
  "room.competencias.coding.1": {
    es: "Desarrollo de software guiado por agentes",
    en: "Agent-guided software development"
  },
  "room.competencias.coding.2": {
    es: "Producto desde SPEC + TDD con agentes",
    en: "Product from SPEC + TDD with agents"
  },
  "room.competencias.coding.3": {
    es: "Mantenimiento e integración asistidos por IA",
    en: "AI-assisted maintenance and integration"
  },
  "room.competencias.sovereignty.label": {
    es: "Soberanía Tecnológica",
    en: "Technological Sovereignty"
  },
  "room.competencias.sovereignty.1": {
    es: "Self-hosting · infraestructura propia",
    en: "Self-hosting · own infrastructure"
  },
  "room.competencias.sovereignty.2": {
    es: "Inferencia soberana (LiteLLM · Ollama · cascada $0-primero)",
    en: "Sovereign inference (LiteLLM · Ollama · $0-first cascade)"
  },
  "room.competencias.sovereignty.3": {
    es: "ERPNext self-hosted · ERP y contabilidad sin SaaS propietario",
    en: "ERPNext self-hosted · ERP and accounting without proprietary SaaS"
  },
  "room.competencias.sovereignty.4": {
    es: "Privacidad y datos propios (multi-tenant)",
    en: "Privacy and own data (multi-tenant)"
  },
  "room.competencias.sovereignty.5": { es: "Linux · macOS", en: "Linux · macOS" },
  "room.competencias.open.label": { es: "Open Source", en: "Open Source" },
  "room.competencias.open.1": {
    es: "AionCore · Agente Pi como built-in ACP ↗",
    en: "AionCore · Pi agent as built-in ACP ↗"
  },
  "room.competencias.open.2": {
    es: "pi-acp · session/delete ACP lifecycle ↗",
    en: "pi-acp · session/delete ACP lifecycle ↗"
  },
  "room.competencias.open.3": {
    es: "AionUi · Theme-aware monochrome logos (merged) ↗",
    en: "AionUi · Theme-aware monochrome logos (merged) ↗"
  },
  "room.competencias.open.4": {
    es: "Publicación Kontablo · BSL 1.1 → Apache 2.0",
    en: "Kontablo publication · BSL 1.1 → Apache 2.0"
  },
  "room.competencias.platforms.label": {
    es: "Plataformas & Ecosistema",
    en: "Platforms & Ecosystem"
  },
  "room.competencias.platforms.1": { es: "ERPNext · Zoho ERP", en: "ERPNext · Zoho ERP" },
  "room.competencias.platforms.2": { es: "Supabase · Chatwoot", en: "Supabase · Chatwoot" },
  "room.competencias.sciences.label": { es: "Ciencias", en: "Sciences" },
  "room.competencias.sciences.1": { es: "Sistemas complejos", en: "Complex systems" },
  "room.competencias.sciences.2": {
    es: "Difractometría de rayos X",
    en: "X-ray diffractometry"
  },
  "room.competencias.sciences.3": { es: "Seguridad radiológica", en: "Radiological safety" },
  "room.competencias.languages.label": { es: "Idiomas", en: "Languages" },
  "room.competencias.languages.1": { es: "Español — nativo", en: "Spanish — native" },
  "room.competencias.languages.2": { es: "Inglés — intermedio", en: "English — intermediate" },
  "room.competencias.languages.3": { es: "Francés — B1", en: "French — B1" },
  "room.competencias.interestsLabel": { es: "INTERESES", en: "INTERESTS" },

  /* ── SALA CONTACTO · enlaces ────────────────────────────────── */
  "room.contacto.whatsapp": { es: "WhatsApp (+593) 99 371 6335", en: "WhatsApp (+593) 99 371 6335" },
  "room.contacto.orcid": { es: "ORCID 0000-0002-6955-5384", en: "ORCID 0000-0002-6955-5384" },
  "room.contacto.scholar": { es: "Google Scholar", en: "Google Scholar" },
  "room.contacto.github": { es: "GitHub", en: "GitHub" },
  "room.contacto.linkedin": { es: "LinkedIn", en: "LinkedIn" },
  "room.contacto.researchgate": { es: "ResearchGate", en: "ResearchGate" },
  "room.contacto.x": { es: "X @cluciani_ve", en: "X @cluciani_ve" },
  "room.contacto.instagram": { es: "Instagram", en: "Instagram" },
  "room.contacto.patreon": { es: "Patreon", en: "Patreon" },
  "room.contacto.substack": { es: "Substack", en: "Substack" },

  /* ── SALA GALERÍA · grupos, pies y placeholders ─────────────── */
  "gallery.action.photo": { es: "Añadir fotografía", en: "Add photograph" },
  "gallery.action.screenshot": { es: "Añadir captura", en: "Add screenshot" },
  "gallery.amazon.label": { es: "DRAHMA · CAMPO AMAZÓNICO", en: "DRAHMA · AMAZON FIELDWORK" },
  "gallery.amazon.1.caption": {
    es: "Drahma — interfaz del tutor en campo",
    en: "Drahma — tutor interface in the field"
  },
  "gallery.amazon.1.title": { es: "DRAHMA EN CAMPO", en: "DRAHMA IN THE FIELD" },
  "gallery.amazon.2.caption": {
    es: "Comunidad indígena amazónica · prueba piloto",
    en: "Amazonian indigenous community · pilot test"
  },
  "gallery.amazon.2.title": { es: "COMUNIDAD AMAZÓNICA", en: "AMAZONIAN COMMUNITY" },
  "gallery.amazon.3.caption": {
    es: "Pantalla del sistema Drahma · agosto 2024",
    en: "Drahma system screen · August 2024"
  },
  "gallery.amazon.3.title": { es: "INTERFAZ DEL SISTEMA", en: "SYSTEM INTERFACE" },
  "gallery.stem.label": {
    es: "LABORATORIO STEM · FABRICACIÓN PEDAGÓGICA",
    en: "STEM LAB · PEDAGOGICAL FABRICATION"
  },
  "gallery.stem.1.caption": { es: "Laboratorio STEM — USFQ 2024", en: "STEM Lab — USFQ 2024" },
  "gallery.stem.1.title": { es: "IMPRESORA 3D", en: "3D PRINTER" },
  "gallery.stem.2.caption": {
    es: "Juguetes pedagógicos producidos",
    en: "Educational toys produced"
  },
  "gallery.stem.2.title": { es: "MATERIALES DIDÁCTICOS", en: "TEACHING MATERIALS" },
  "gallery.stem.3.caption": { es: "Cortadora láser en proceso", en: "Laser cutter in process" },
  "gallery.stem.3.title": { es: "CORTADORA LÁSER", en: "LASER CUTTER" },
  "gallery.stem.4.caption": {
    es: "Estudiantes con los materiales",
    en: "Students with the materials"
  },
  "gallery.stem.4.title": { es: "SESIÓN CON ESTUDIANTES", en: "SESSION WITH STUDENTS" },
  "gallery.science.label": { es: "CIENCIA EN PÚBLICO · EVENTOS", en: "PUBLIC SCIENCE · EVENTS" },
  "gallery.science.1.caption": {
    es: "Casa Abierta USFQ — experimentos para público general",
    en: "USFQ Open House — experiments for the general public"
  },
  "gallery.science.1.title": { es: "CASA ABIERTA USFQ", en: "USFQ OPEN HOUSE" },
  "gallery.science.2.caption": {
    es: "Difractómetro de rayos X — USFQ",
    en: "X-ray diffractometer — USFQ"
  },
  "gallery.science.2.title": { es: "DIFRACTÓMETRO DE RAYOS X", en: "X-RAY DIFFRACTOMETER" },
  "footer.clientLabs": { es: "Laboratorios de cliente", en: "Client labs" }

};
