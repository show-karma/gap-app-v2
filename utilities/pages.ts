export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/not-found`,
  PROJECTS_EXPLORER: `/projects`,
  COMMUNITY: {
    ALL_GRANTS: (community: string) => `/community/${community}`,
    IMPACT: (community: string) => `/community/${community}/impact`,
    PROJECT_DISCOVERY: (community: string) =>
      `/community/${community}/impact/project-discovery`,
    RECEIVEPROJECTUPDATES: (community: string) =>
      `/community/${community}/receive-project-updates`,
  },
  MY_PROJECTS: `/my-projects`,
  ADMIN: {
    LIST: `/admin`,
    ROOT: (community: string) => `/${community}/admin`,
    EDIT_CATEGORIES: (community: string) =>
      `/${community}/admin/edit-categories`,
    MILESTONES: (community: string) => `/${community}/admin/milestones-report`,
    MANAGE_INDICATORS: (community: string) =>
      `/${community}/admin/manage-indicators`,
    COMMUNITIES: `/admin/communities`,
    COMMUNITY_STATS: `/admin/communities/stats`,
    PROJECTS: `/admin/projects`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    UPDATES: (project: string) => `/project/${project}?tab=updates`,
    GRANTS: (project: string) => `/project/${project}/grants`,
    ROADMAP: {
      ROOT: (project: string) => `/project/${project}/roadmap`,
    },
    GRANT: (project: string, grant: string) =>
      `/project/${project}/grants/${grant}`,
    CONTACT_INFO: (project: string) => `/project/${project}/contact-info`,
    MILESTONES_AND_UPDATES: (project: string, grant: string) =>
      `/project/${project}/grants/${grant}/milestones-and-updates`,
    IMPACT: {
      ROOT: (project: string) => `/project/${project}/impact`,
      ADD_IMPACT: (project: string) =>
        `/project/${project}/impact?tab=add-impact`,
    },
    SCREENS: {
      NEW_GRANT: (project: string) => `/project/${project}/grants/create-grant`,
      SELECTED_SCREEN: (project: string, grant: string, screen: string) =>
        `/project/${project}/grants/${grant}/${screen}`,
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
};
