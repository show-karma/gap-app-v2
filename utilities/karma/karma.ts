import { CANONICAL_ORIGIN, GOV_HOST } from "@/utilities/domains";
import { normalizeBaseUrl } from "@/utilities/wellKnown";
import { envVars } from "../enviromentVars";

export const karmaLinks = {
  website: `https://${GOV_HOST}`,
  githubSDK: "https://github.com/show-karma/karma-gap-sdk",
  skills: "https://github.com/show-karma/skills",
  // The docs are served by the indexer, so this follows wherever the indexer
  // lives rather than naming a host. It was pinned to gapapi.karmahq.xyz and
  // kept pointing there after the API moved to api.karmahq.org, so the global
  // footer contradicted /.well-known/api-catalog on every page.
  // normalizeBaseUrl (not getIndexerBaseUrl) because this renders in the
  // footer: a throw here would take down every page, and the shape is asserted
  // in tests instead.
  apiDocs: `${normalizeBaseUrl(envVars.NEXT_PUBLIC_GAP_INDEXER_URL)}/v2/docs`,
  llmsTxt: `${CANONICAL_ORIGIN}/llms.txt`,
};

export const karmaAPI = {
  findDelegate: (dao: string, user: string) =>
    `${envVars.NEXT_PUBLIC_KARMA_API}/dao/find-delegate?dao=${dao}&user=${user}`,
};
