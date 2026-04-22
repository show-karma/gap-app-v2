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
    APPLICATION_SUCCESS: (community: string, applicationId: string) =>
      `/community/${community}/applications/${applicationId}/success`,
    BROWSE_APPLICATIONS: (community: string) => `/community/${community}/browse-applications`,
    CLAIM_FUNDS: (community: string) => `/community/${community}/claim-funds`,
    REPORTS: (community: string) => `/community/${community}/reports`,
  },
  MY_PROJECTS: `/my-projects`,
  MY_REVIEWS: `/my-reviews`,
  DASHBOARD: `/dashboard`,
  DONATIONS: `/donations`,
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
      MILESTONES: (community: string, programId: string, projectId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/milestones/${projectId}`,
    },
  },
  MANAGE: {
    ROOT: (community: string) => `/community/${community}/manage`,
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
      MILESTONES: (community: string, programId: string, projectId: string) =>
        `/community/${community}/manage/funding-platform/${programId}/milestones/${projectId}`,
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
    PROGRAM_SCORES: (community: string) => `/community/${community}/manage/program-scores`,
    SEND_EMAIL: (community: string) => `/community/${community}/manage/send-email`,
    PORTFOLIO_REPORTS: (community: string) => `/community/${community}/manage/portfolio-reports`,
    PORTFOLIO_REPORTS_CONFIG: (community: string) => `/community/${community}/manage/portfolio-reports/config`,
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
  SEEDS: `/seeds`,
  SEEDS_FUND: `/seeds/fund`,
};

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
