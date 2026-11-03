/**
 * CvProfile — proyección pública del perfil compilado (SPEC §5.1/§5.2).
 *
 * QUÉ ES: el contrato que consume el CV. NO es el `LoadedProfile` del motor
 * (`pasco export profile --json`): es una proyección explícita, campo por campo,
 * de los roots que el CV usa. Todo lo demás del SSOT (bios, faq, flavor,
 * deployments, checks, socialHandles, press, releases, `active`, email, handle,
 * timezone, nationality, authors, kind, artifactRefs, ids de fila, …) queda
 * afuera del archivo commiteado.
 *
 * POR QUÉ (repo público): `src/data/profile.generated.ts` se commitea en un
 * repo público; `credentials[]` y `artifacts[]` se filtran a
 * `visibility === "public"` (ausente = público, profile-as-code §18.5) y también
 * se descartan las REFERENCIAS (`projects[].links`, `evidence[].source`) que
 * apunten a un locator/verifyUrl no público.
 *
 * Determinismo: `source.generatedAt` es `null` salvo que el caller pase `--now`;
 * mismo input → mismo output byte a byte.
 */

export interface LangText {
  en: string;
  es?: string;
}

export interface Link {
  platform: string;
  label: string;
  url: string;
}

export interface ExperienceItem {
  role: LangText;
  /** Proper noun — invariant across languages: the schema declares `org` as a
   *  plain string, never a langMap (SPEC §11/§15.6). */
  org: string;
  start: string;
  end: string;
  highlights?: { en: string[]; es?: string[] };
}

/** v1.1/v1.3: formal education (root `education[]`). */
export interface EducationItem {
  id?: string;
  degree: LangText;
  /** Proper noun — institutions are never translated (schema: plain string). */
  institution: string;
  field?: LangText;
  start: string;
  end?: string;
  note?: LangText;
}

/** v1.1: spoken languages (root `languages[]`). */
export interface LanguageItem {
  code: string;
  level: string;
}

/** v1.4 (D17/§18): third-party attestations — the proof registry, not "evidence". */
export interface CredentialItem {
  id: string;
  kind: string;
  title: string;
  issuer: string;
  credentialId?: string;
  verifyUrl?: string;
  issued?: string;
  expires?: string;
}

/** v1.4 (D17/§18): works/media registry, pointer-first (`locator` XOR url|path). */
export interface ArtifactItem {
  id: string;
  kind: string;
  title: string;
  description?: LangText;
  locator: { url?: string; path?: string };
  checksum?: string;
  license?: string;
  tags?: string[];
}

export interface ProjectItem {
  name: string;
  status?: string;
  description?: LangText;
  links: string[];
  keywords: string[];
  evidence: { claim: LangText; source: string; verified?: string }[];
}

export interface PublicationItem {
  title: string;
  venue: string;
  year: number;
  doi?: string;
  orcidId?: string;
  /** `url` explícita del SSOT (v1.1) o fallback derivado https://doi.org/<doi>;
   *  "" si no hay ninguna de las dos. */
  url: string;
}

export interface SkillItem {
  name: string;
  level?: string;
  keywords: string[];
  geoKeywords?: string[];
  platformWeights?: Record<string, number>;
}

/** Procedencia del sync (GEO / auditabilidad). */
export interface CvSource {
  repo: string;
  commit: string;
  /** ISO 8601 cuando el caller pasa `--now`; `null` por defecto (sin reloj). */
  generatedAt: string | null;
}

export interface CvProfile {
  identity: {
    name: string;
    givenName: string;
    familyName: string;
    location?: string;
    photo?: string;
    links: Link[];
  };
  positioning: {
    statement: LangText;
    audiences: Record<string, LangText>;
    geo?: {
      semanticAssociations?: string[];
      citationsGoal?: LangText;
    };
  };
  headlines: { platform: string; lang: string; text: string }[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  publications: PublicationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  /** v1.4/§18: registry roots; only `visibility: public` entries reach this public snapshot. */
  credentials: CredentialItem[];
  artifacts: ArtifactItem[];
  keywords: {
    seo: Record<string, string[]>;
    geo: { associations: string[]; claims: string[] };
  };
  source: CvSource;
}
