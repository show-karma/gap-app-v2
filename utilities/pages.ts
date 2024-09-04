export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/not-found`,
  COMMUNITY: {
    ALL_GRANTS: (community: string) => `/${community}`,
    RECEIVEPROJECTUPDATES: (community: string) =>
      `/${community}/receive-project-updates`,
  },
  MY_PROJECTS: `/my-projects`,
  ADMIN: {
    LIST: `/admin`,
    ROOT: (community: string) => `/${community}/admin`,
    ASSIGN_QUESTIONS: (community: string) =>
      `/${community}/admin/assign-questions`,
    EDIT_CATEGORIES: (community: string) =>
      `/${community}/admin/edit-categories`,
    MILESTONES: (community: string) => `/${community}/admin/milestones-report`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    UPDATES: (project: string) => `/project/${project}?tab=updates`,
    GRANTS: (project: string) => `/project/${project}/grants`,
    GRANT: (project: string, grant: string) =>
      `/project/${project}/grants/${grant}`,
    CONTACT_INFO: (project: string) => `/project/${project}/contact-info`,
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
};
