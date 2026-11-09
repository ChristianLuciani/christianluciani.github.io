/**
 * Lado NODE del export de agentes (#145): inyecta el SSOT commiteado y la
 * provenance parseada del header (que usa node:fs — por eso vive acá y NO en
 * export.ts, que el bundle del lab puede importar sin romper).
 *
 * El browser nunca importa este módulo; el lab lee los JSON servidos en
 * /agent/*.json.
 */
import { PROFILE } from "../data/profile.generated.ts";
import { ENTITY } from "../data/entity.generated.ts";
import { PROFILE_COMMIT, PROFILE_ENGINE } from "../data/profile.provenance.ts";
import type { CvProfile } from "../data/profile.types.ts";
import { agentFiles, agentManifest, chatContext, type AgentProvenance } from "./export.ts";
import type { EntityJsonLd } from "./entity.ts";

export const SITE_PROFILE = PROFILE as unknown as CvProfile;

export const SITE_PROVENANCE: AgentProvenance = {
  commit: PROFILE_COMMIT,
  engine: PROFILE_ENGINE.version,
  schema: PROFILE_ENGINE.schema
};

const SITE_ENTITY = ENTITY as unknown as EntityJsonLd;

export const siteManifest = () => agentManifest(SITE_PROVENANCE);
export const siteChatContext = () => chatContext(SITE_PROFILE, SITE_PROVENANCE, SITE_ENTITY);
export const siteAgentFiles = () => agentFiles(SITE_PROFILE, SITE_PROVENANCE, SITE_ENTITY);
