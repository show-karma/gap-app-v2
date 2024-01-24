export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/404`,
  COMMUNITY: {
    ALL_GRANTS: (community: string) => `/community/${community}`,
  },
  MY_PROJECTS: `/my-projects`,
  ADMIN: (community: string) => `/community/${community}/admin`,
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    GRANTS: (project: string) => `/project/${project}?tab=grants`,
    GRANT: (project: string, grant: string) =>
      `/project/${project}?tab=grants&grant=${grant}`,
    TEAM: (project: string) => `/project/${project}?tab=team`,
  },
};
