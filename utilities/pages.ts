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
    FUNDING_OPPORTUNITIES: (community: string) => `/community/${community}/funding-opportunities`,
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
  // REVIEWER routes now point to MANAGE (unified RBAC-based routes)
  REVIEWER: {
    DASHBOARD: (community: string) => `/community/${community}/manage/funding-platform`,
    APPLICATIONS: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/applications`,
    APPLICATION_DETAIL: (community: string, programId: string, applicationId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/applications/${applicationId}`,
    QUESTION_BUILDER: (community: string, programId: string) =>
      `/community/${community}/manage/funding-platform/${programId}/question-builder`,
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
    PROGRAM_SCORES: (community: string) => `/community/${community}/manage/program-scores`,
    PROJECT_MILESTONES: (community: string, projectId: string, programId: string) =>
      `/community/${community}/manage/${projectId}/milestones?programIds=${programId}`,
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
};

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
