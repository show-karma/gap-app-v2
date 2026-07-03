import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "./enviromentVars";

export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/not-found`,
  PROJECTS_EXPLORER: `/projects`,
  COMMUNITIES: `/communities`,
  PRIVACY_POLICY: `/privacy-policy`,
  TERMS_AND_CONDITIONS: `/terms-and-conditions`,
  COMMUNITY: {
    ALL_GRANTS: (community: string, programId?: string) =>
      `/community/${community}${programId ? `?programId=${programId}` : ""}`,
    PROJECTS: (community: string, programId?: string) =>
      `/community/${community}/projects${programId ? `?programId=${programId}` : ""}`,
    FUNDING_OPPORTUNITIES: (community: string) => `/community/${community}/funding-opportunities`,
    IMPACT: (community: string) => `/community/${community}/impact`,
    DONATE: (community: string) => `/community/${community}/donate`,
    DONATE_PROGRAM: (community: string, programId: string) =>
      `/community/${community}/donate/${programId}`,
    DONATE_PROGRAM_CHECKOUT: (community: string, programId: string) =>
      `/community/${community}/donate/${programId}/checkout`,
    PROJECT_DISCOVERY: (community: string) => `/community/${community}/impact/project-discovery`,
    UPDATES: (community: string) => `/community/${community}/updates`,
    FINANCIALS: (community: string) => `/community/${community}/financials`,
    RECEIVEPROJECTUPDATES: (community: string) => `/community/${community}/receive-project-updates`,
    PROGRAMS: (community: string) => `/community/${community}/funding-opportunities`,
    PROGRAM_DETAIL: (community: string, programId: string) =>
      `/community/${community}/programs/${programId}`,
    PROGRAM_APPLY: (community: string, programId: string) =>
      `/community/${community}/programs/${programId}/apply`,
    APPLICATIONS: (community: string) => `/community/${community}/applications`,
    APPLICATION_DETAIL: (community: string, applicationId: string) =>
      `/community/${community}/applications/${applicationId}`,
    APPLICATION_EDIT: (community: string, referenceNumber: string) =>
      `/community/${community}/applications/${referenceNumber}/edit`,
    APPLICATION_SUCCESS: (community: string, applicationId: string) =>
      `/community/${community}/applications/${applicationId}/success`,
    BROWSE_APPLICATIONS: (community: string) => `/community/${community}/browse-applications`,
    CLAIM_FUNDS: (community: string) => `/community/${community}/claim-funds`,
    REPORTS: (community: string) => `/community/${community}/reports`,
    REPORT_DETAIL: (community: string, runDate: string) =>
      `/community/${community}/reports/${encodeURIComponent(runDate)}`,
    ASK_KARMA: (community: string) => `/community/${community}/ask-karma`,
  },
  MY_PROJECTS: `/my-projects`,
  MY_REVIEWS: `/my-reviews`,
  DASHBOARD: `/dashboard`,
  DONATIONS: `/donations`,
  DONOR_RESEARCH: {
    INDEX: `/nonprofit-research`,
    ONBOARDING: `/nonprofit-research/onboarding`,
    REPORT: (reportId: string) => `/nonprofit-research/${reportId}`,
    SHARED: (token: string) => `/nonprofit-research/shared/${token}`,
    // Staff-only admin overview (DEV-467).
    ADMIN: `/admin/nonprofit-research`,
    ADMIN_REPORT: (reportId: string) => `/admin/nonprofit-research/${reportId}`,
    // Advisor's one-per-advisor diligence question template editor (DEV-428).
    DILIGENCE_TEMPLATE: `/nonprofit-research/diligence-template`,
    // Public nonprofit response page — the secure email link opens this.
    // The token in the path is the capability; no login required.
    DILIGENCE_RESPONSE: (token: string) => `/nonprofit-research/diligence/${token}`,
  },
  EVALUATE: `/evaluate`,
  // REVIEWER routes now point to MANAGE (unified RBAC-based routes)
  REVIEWER: {
    DASHBOARD: (community: string) => `/community/${community}/manage/funding-platform`,
    APPLICATIONS: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/applications`,
    APPLICATION_DETAIL: (community: string, programId: string, applicationId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/applications/${applicationId}`,
    QUESTION_BUILDER: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/question-builder`,
    FUNDING_PLATFORM: {
      MILESTONES: (
        community: string,
        programId: string,
        projectId: string,
        milestoneUid?: string
      ) =>
        `/community/${community}/manage/funding-platform/${programId}/milestones/${projectId}${
          milestoneUid ? `#milestone-${encodeURIComponent(milestoneUid)}` : ""
        }`,
    },
  },
  MANAGE: {
    ROOT: (community: string) => `/community/${community}/manage`,
    ACTION_ITEMS: (community: string) => `/community/${community}/manage/action-items`,
    FUNDING_PLATFORM: {
      ROOT: (community: string) => `/community/${community}/manage/funding-platform`,
      APPLICATIONS: (community: string, programId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/applications`,
      APPLICATION_DETAIL: (community: string, programId: string, applicationId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/applications/${applicationId}`,
      QUESTION_BUILDER: (community: string, programId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/question-builder`,
      SETUP: (community: string, programId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/setup`,
      MILESTONES: (
        community: string,
        programId: string,
        projectId: string,
        milestoneUid?: string
      ) =>
        `/community/${community}/manage/funding-platform/${programId}/milestones/${projectId}${
          milestoneUid ? `#milestone-${encodeURIComponent(milestoneUid)}` : ""
        }`,
    },
  },
  ADMIN: {
    LIST: `/admin`,
    ROOT: (community: string) => `/community/${community}/manage`,
    EDIT_CATEGORIES: (community: string) => `/community/${community}/manage/edit-categories`,
    EDIT_PROJECTS: (community: string) => `/community/${community}/manage/edit-projects`,
    MILESTONES: (community: string) => `/community/${community}/manage/milestones-report`,
    MANAGE_INDICATORS: (community: string) => `/community/${community}/manage/manage-indicators`,
    TRACKS: (community: string) => `/community/${community}/manage/tracks`,
    FUNDING_PLATFORM: (community: string) => `/community/${community}/manage/funding-platform`,
    FUNDING_PLATFORM_QUESTION_BUILDER: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/question-builder`,
    FUNDING_PLATFORM_APPLICATIONS: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/applications`,
    COMMUNITIES: `/admin/communities`,
    COMMUNITY_STATS: `/admin/communities/stats`,
    PROJECTS: `/admin/projects`,
    PAYOUTS: (community: string) => `/community/${community}/manage/payouts`,
    CONTROL_CENTER: (community: string) => `/community/${community}/manage/control-center`,
    KYC_SETTINGS: (community: string) => `/community/${community}/manage/kyc-settings`,
    NOTIFICATION_SETTINGS: (community: string) =>
      `/community/${community}/manage/notification-settings`,
    KNOWLEDGE_BASE: (community: string) => `/community/${community}/manage/knowledge-base`,
    ACCESS_DENIED_MESSAGES: (community: string) =>
      `/community/${community}/manage/access-denied-messages`,
    PROGRAM_SCORES: (community: string) => `/community/${community}/manage/program-scores`,
    SEND_EMAIL: (community: string) => `/community/${community}/manage/send-email`,
    PORTFOLIO_REPORTS: (community: string) => `/community/${community}/manage/portfolio-reports`,
    PORTFOLIO_REPORTS_PREVIEW: (community: string, reportId: string) =>
      `/community/${community}/manage/portfolio-reports/${reportId}/preview`,
    PORTFOLIO_REPORTS_CONFIG: (community: string) =>
      `/community/${community}/manage/portfolio-reports/config`,
    PROJECT_MILESTONES: (community: string, projectId: string, programId: string) =>
      `/community/${community}/manage/${projectId}/milestones?programIds=${programId}`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    UPDATES: (project: string) => `/project/${project}`,
    ABOUT: (project: string) => `/project/${project}/about`,
    GRANTS: (project: string) => `/project/${project}/funding`,

    GRANT: (project: string, grant: string) => `/project/${project}/funding/${grant}`,
    CONTACT_INFO: (project: string) => `/project/${project}/contact-info`,
    MILESTONES_AND_UPDATES: (project: string, grant: string) =>
      `/project/${project}/funding/${grant}/milestones-and-updates`,
    IMPACT: {
      ROOT: (project: string) => `/project/${project}/impact`,
      ADD_IMPACT: (project: string) => `/project/${project}/impact?tab=add-impact`,
    },
    SCREENS: {
      NEW_GRANT: (project: string) => `/project/${project}/funding/new`,
      SELECTED_SCREEN: (project: string, grant: string, screen: string) =>
        `/project/${project}/funding/${grant}/${screen}`,
    },
    TEAM: (project: string) => `/project/${project}/team`,
  },
  REGISTRY: {
    ROOT: `/funding-map`,
    BY_PROGRAM_ID: (programId: string) => `/funding-map?programId=${programId}`,
    ADD_PROGRAM: `/funding-map/add-program`,
    MANAGE_PROGRAMS: `/funding-map/manage-programs`,
  },
  STATS: `/stats`,
  SUMUP_CONFIG: `/admin/sumup`,
  FOUNDATIONS: `/foundations`,
  FUNDERS: `/funders`,
  FOR_PROJECTS: `/for-projects`,
  FOR_AGENTS: `/for-agents`,
  NONPROFITS: `/nonprofits`,
  DONOR_ADVISORS: `/donor-advisors`,
  CREATE_PROJECT_PROFILE: `/create-project-profile`,
  MCP_CONNECT: `/mcp/connect`,
  SEEDS: `/seeds`,
  SEEDS_FUND: `/seeds/fund`,
  TEAM: {
    LIST: `/ai-teams`,
    ONBOARDING: `/ai-teams/onboarding`,
    DIRECTORY: (slug: string) => `/ai-teams/${slug}/team`,
    MEMBER: (slug: string, role: string) => `/ai-teams/${slug}/team/${role}`,
  },
  ORG: (slug: string) => `/ai-teams/${slug}/org`,
  WORK: (slug: string) => `/ai-teams/${slug}/work`,
  SKILLS: (slug: string) => `/ai-teams/${slug}/skills`,
  ASK_KARMA: `/ask-karma`,
  SCANNER: {
    ROOT: `/scanner`,
    SCAN_DETAIL: (id: string) => `/scanner/scans/${id}`,
    PUBLIC_SCORECARD: (slug: string) => `/s/${slug}`,
    OG_IMAGE: (slug: string) => `/api/scanner/og/${slug}`,
  },
};

/**
 * Detects pathnames that belong to the ask-karma feature — both the root
 * `/ask-karma` route and the community-scoped `/community/<slug>/ask-karma`
 * route. Lives next to the route constants so any rename here updates the
 * detection automatically.
 */
const ASK_KARMA_COMMUNITY_PATTERN = /^\/community\/[^/]+\/ask-karma$/;
export function isAskKarmaPathname(pathname: string): boolean {
  return pathname === PAGES.ASK_KARMA || ASK_KARMA_COMMUNITY_PATTERN.test(pathname);
}

/**
 * First path segments under /community/[communityId]/ that should be rewritten
 * in whitelabel mode. Derived from PAGES.COMMUNITY route definitions and
 * filesystem route directories. This is the single source of truth — used by
 * middleware.ts to decide which paths get the /community/<slug> prefix.
 */
export const COMMUNITY_SUB_ROUTE_SEGMENTS: ReadonlySet<string> = new Set([
  // From PAGES.COMMUNITY
  "applications",
  "browse-applications",
  "claim-funds",
  "donate",
  "financials",
  "funding-opportunities",
  "impact",
  "programs",
  "projects",
  "reports",
  "updates",
  // Direct route directories under /community/[communityId]/
  "admin",
  "ask-karma",
  "karma-ai",
  "manage",
]);

export const FUNDING_PLATFORM_PAGES = (tenantId: string, _domain?: string) => {
  const sharedDomain = envVars.isDev
    ? `${FUNDING_PLATFORM_DOMAINS.shared.dev}/${tenantId}`
    : `${FUNDING_PLATFORM_DOMAINS.shared.prod}/${tenantId}`;
  const domain = _domain || sharedDomain;
  return {
    HOME: `${domain}/`,
    PROGRAM_PAGE: (programId: string) => `${domain}/programs/${programId}`,
    PROGRAM_APPLY: (programId: string) => `${domain}/programs/${programId}/apply`,
    PROGRAM_APPLICATION: (applicationId: string) => `${domain}/applications/${applicationId}`,
    PROGRAMS_BROWSE_APPLICATIONS: (programId?: string) =>
      programId
        ? `${domain}/browse-applications?programId=${programId}`
        : `${domain}/browse-applications`,
  };
};

// ── Find Funders (foundations + nonprofits search) ──────────────────────────
// Route constants for the /nonprofits/find-funders feature area. Surfaces
// foundation profiles, nonprofit profiles, grants, and the agentic search
// workbench grounded in IRS 990 filings.

const FIND_FUNDERS = "/nonprofits/find-funders";

export const NON_PROFITS_PAGES = {
  HOME: FIND_FUNDERS,
  DEEP_RESEARCH: "/nonprofits/find-funders-deep-research" as const,
  SEARCH: (id: string) => `${FIND_FUNDERS}/search/${id}`,
  FOUNDATION: (id: string, searchId?: string) =>
    `${FIND_FUNDERS}/foundations/${id}${searchId ? `?searchId=${searchId}` : ""}`,
  NONPROFIT: (id: string, search?: { searchId?: string; grantId?: string }): string => {
    const params = new URLSearchParams();
    if (search?.searchId) params.set("searchId", search.searchId);
    if (search?.grantId) params.set("grantId", search.grantId);
    const qs = params.toString();
    return `${FIND_FUNDERS}/nonprofits/${id}${qs ? `?${qs}` : ""}`;
  },
  GRANT: (id: string, searchId?: string) =>
    `${FIND_FUNDERS}/grants/${id}${searchId ? `?searchId=${searchId}` : ""}`,
  CONNECT: `${FIND_FUNDERS}/connect` as const,
  CONNECT_CLAUDE: `${FIND_FUNDERS}/connect/claude` as const,
  CONNECT_CHATGPT: `${FIND_FUNDERS}/connect/chatgpt` as const,
} as const;
