import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { INDEXER } from "@/utilities/indexer";

// Internal team-role identifiers. Six are user-facing in the directory.
// `orchestrator` is the Team Lead and intentionally hidden from the roster
// (it appears as part of the "team" abstraction, not a clickable employee).
export const TEAM_ROLES = [
  "orchestrator",
  "prospect-researcher",
  "grant-writer",
  "marketing",
  "accounting",
  "tech",
  "operations",
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const VISIBLE_TEAM_ROLES: TeamRole[] = [
  "prospect-researcher",
  "grant-writer",
  "marketing",
  "accounting",
  "tech",
  "operations",
];

// Product-language labels — never leak Hermes terms ("profile", "SOUL") to
// the UI copy. Renderers use these.
export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  orchestrator: "Team Lead",
  "prospect-researcher": "Prospect Researcher",
  "grant-writer": "Grant Writer",
  marketing: "Marketing",
  accounting: "Accounting",
  tech: "Tech",
  operations: "Operations",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  orchestrator: "Plans and assigns work across the team.",
  "prospect-researcher": "Finds grant opportunities and maintains the funding pipeline.",
  "grant-writer": "Drafts LOIs, proposals, narratives, and grant reports.",
  marketing: "Donor communications, newsletters, social, and impact stories.",
  accounting: "Budget narratives, reconciliation, and financial report support.",
  tech: "Website updates, automation, data cleanup, and integrations.",
  operations: "Process support, vendor coordination drafts, and meeting prep.",
};

export interface HermesOrgResponse {
  id: string;
  slug: string;
  communityId: string | null;
  status: "provisioning" | "active" | "suspended" | "failed";
  statusReason: string | null;
  provisionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HermesProfileResponse {
  name: string;
  path?: string;
  is_default?: boolean;
  model?: string;
  skill_count?: number;
}

export interface ProvisionOrgInput {
  slug: string;
  communityId?: string | null;
  containerUrl: string;
  sessionToken: string;
}

export interface UpdateAboutInput {
  slug: string;
  role: TeamRole;
  content: string;
}

// Single instance reused across hooks. The shared API client handles auth
// (Bearer token) and 401 refresh — see utilities/auth/api-client.ts.
const api = createAuthenticatedApiClient();

export const hermesClient = {
  async getOrg(slug: string): Promise<HermesOrgResponse> {
    const { data } = await api.get<HermesOrgResponse>(INDEXER.HERMES.ORG(slug));
    return data;
  },

  async listProfiles(slug: string): Promise<HermesProfileResponse[]> {
    const { data } = await api.get<{ profiles: HermesProfileResponse[] }>(
      INDEXER.HERMES.PROFILES(slug)
    );
    return data.profiles;
  },

  async getAbout(slug: string, role: TeamRole): Promise<string> {
    const { data } = await api.get<{ content: string }>(INDEXER.HERMES.SOUL(slug, role));
    return data.content;
  },

  async updateAbout(input: UpdateAboutInput): Promise<void> {
    await api.put(INDEXER.HERMES.SOUL(input.slug, input.role), {
      content: input.content,
    });
  },

  async provision(input: ProvisionOrgInput): Promise<HermesOrgResponse> {
    const { data } = await api.post<HermesOrgResponse>(INDEXER.HERMES.PROVISION(input.slug), {
      slug: input.slug,
      communityId: input.communityId ?? null,
      containerUrl: input.containerUrl,
      sessionToken: input.sessionToken,
    });
    return data;
  },
};
