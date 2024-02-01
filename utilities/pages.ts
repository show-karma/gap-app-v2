export const PAGES = {
  HOME: `/`,
  NOT_FOUND: `/404`,
  COMMUNITY: {
    ALL_GRANTS: (community: string) => `/community/${community}`,
  },
  MY_PROJECTS: `/my-projects`,
  ADMIN: {
    LIST: `/communities-to-admin`,
    ROOT: (community: string) => `/community/${community}/admin`,
    ASSIGN_QUESTIONS: (community: string) =>
      `/community/${community}/admin/assign-questions`,
    EDIT_CATEGORIES: (community: string) =>
      `/community/${community}/admin/edit-categories`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    GRANTS: (project: string) => `/project/${project}/grants?tab=overview`,
    GRANT: (project: string, grant: string) =>
      `/project/${project}/grants?grantId=${grant}&tab=overview`,
    TABS: {
      OVERVIEW: (project: string, grant: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=overview`,
      MILESTONES: (project: string, grant: string, grantTab?: string) =>
        `/project/${project}/grants?grantId=${grant}&tab=milestones-and-updates${
          grantTab ? `&grantTab=${grantTab}` : ""
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
