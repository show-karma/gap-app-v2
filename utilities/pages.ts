export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/404`,
  COMMUNITY: {
    ALL_GRANTS: (community: string) => `/${community}`,
  },
  MY_PROJECTS: `/my-projects`,
  ADMIN: {
    LIST: `/communities-to-admin`,
    ROOT: (community: string) => `/${community}/admin`,
    ASSIGN_QUESTIONS: (community: string) =>
      `/${community}/admin/assign-questions`,
    EDIT_CATEGORIES: (community: string) =>
      `/${community}/admin/edit-categories`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    GRANTS_STANDALONE: (project: string) => `/project/${project}/grants`,
    GRANTS: (project: string) => `/project/${project}/grants?tab=overview`,
    GRANT: (project: string, grant: string) =>
      `/project/${project}/grants?grantId=${grant}&tab=overview`,
    TABS: {
      OVERVIEW: (project: string, grant: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=overview`,
      SELECTED_TAB: (project: string, grant?: string, tab?: string) =>
        `/project/${project}/grants?${grant ? `&grantId=${grant}` : ""}${
          tab ? `&tab=${tab}` : ""
        }`,
      IMPACT_CRITERIA: (project: string, grant: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=impact-criteria`,
      REVIEW_THIS_GRANT: (project: string, grant: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=review-this-grant`,
      REVIEWS: (project: string, grant: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=reviews`,
    },
    TEAM: (project: string) => `/project/${project}/team`,
  },
};
