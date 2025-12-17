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
    IMPACT: (community: string) => `/community/${community}/impact`,
    DONATE: (community: string) => `/community/${community}/donate`,
    DONATE_PROGRAM: (community: string, programId: string) =>
      `/community/${community}/donate/${programId}`,
    DONATE_PROGRAM_CHECKOUT: (community: string, programId: string) =>
      `/community/${community}/donate/${programId}/checkout`,
    PROJECT_DISCOVERY: (community: string) => `/community/${community}/impact/project-discovery`,
    UPDATES: (community: string) => `/community/${community}/updates`,
    RECEIVEPROJECTUPDATES: (community: string) => `/community/${community}/receive-project-updates`,
  },
  MY_PROJECTS: `/my-projects`,
  MY_REVIEWS: `/my-reviews`,
  REVIEWER: {
    DASHBOARD: (community: string) => `/community/${community}/reviewer/funding-platform`,
    APPLICATIONS: (community: string, programId: string, chainId: number) =>
      `/community/${community}/reviewer/funding-platform/${programId}_${chainId}/applications`,
    APPLICATION_DETAIL: (
      community: string,
      programId: string,
      chainId: number,
      applicationId: string
    ) =>
      `/community/${community}/reviewer/funding-platform/${programId}_${chainId}/applications/${applicationId}`,
    QUESTION_BUILDER: (community: string, programId: string, chainId: number) =>
      `/community/${community}/reviewer/funding-platform/${programId}_${chainId}/question-builder`,
  },
  ADMIN: {
    LIST: `/admin`,
    ROOT: (community: string) => `/community/${community}/admin`,
    EDIT_CATEGORIES: (community: string) => `/community/${community}/admin/edit-categories`,
    EDIT_PROJECTS: (community: string) => `/community/${community}/admin/edit-projects`,
    MILESTONES: (community: string) => `/community/${community}/admin/milestones-report`,
    MANAGE_INDICATORS: (community: string) => `/community/${community}/admin/manage-indicators`,
    TRACKS: (community: string) => `/community/${community}/admin/tracks`,
    FUNDING_PLATFORM: (community: string) => `/community/${community}/admin/funding-platform`,
    FUNDING_PLATFORM_QUESTION_BUILDER: (community: string, programId: string) =>
      `/community/${community}/admin/funding-platform/${programId}/question-builder`,
    FUNDING_PLATFORM_APPLICATIONS: (community: string, programId: string) =>
      `/community/${community}/admin/funding-platform/${programId}/applications`,
    COMMUNITIES: `/admin/communities`,
    COMMUNITY_STATS: `/admin/communities/stats`,
    PROJECTS: `/admin/projects`,
    PAYOUTS: (community: string) => `/community/${community}/admin/payouts`,
    PROGRAM_SCORES: (community: string) => `/community/${community}/admin/program-scores`,
    PROJECT_MILESTONES: (community: string, projectId: string, programId: string) =>
      `/community/${community}/admin/${projectId}/milestones?programIds=${programId}`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    UPDATES: (project: string) => `/project/${project}/updates`,
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
  FUNDERS: `/funders`,
  FUNDING_APP:
    process.env.NODE_ENV === "production"
      ? "https://app.karmahq.xyz"
      : "https://testapp.karmahq.xyz",
  EXTERNAL_PROGRAM: {
    DETAIL: (communitySlug: string, programId: string) =>
      `${PAGES.FUNDING_APP}/${communitySlug}/programs/${programId}`,
    APPLY: (communitySlug: string, programId: string) =>
      `${PAGES.FUNDING_APP}/${communitySlug}/programs/${programId}/apply`,
  },
};

export const FUNDING_PLATFORM_PAGES = (tenantId: string, _domain?: string) => {
  const sharedDomain = envVars.isDev
    ? `${FUNDING_PLATFORM_DOMAINS.shared.dev}/${tenantId}`
    : `${FUNDING_PLATFORM_DOMAINS.shared.prod}/${tenantId}`;
  const domain = _domain || sharedDomain;
  console.log("domain", domain);
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
