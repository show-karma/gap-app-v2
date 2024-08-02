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
    MILESTONES: (community: string) => `/${community}/admin/report-milestones`,
  },
  PROJECT: {
    OVERVIEW: (project: string) => `/project/${project}`,
    GRANTS_STANDALONE: (project: string) => `/project/${project}/grants`,
    GRANTS: (project: string) => `/project/${project}/grants?tab=overview`,
    GRANT: (project: string, grant: string) =>
      `/project/${project}/grants?grantId=${grant}&tab=overview`,
    CONTACT_INFO: (project: string) => `/project/${project}/contact-info`,
    IMPACT: {
      ROOT: (project: string) => `/project/${project}/impact`,
      ADD_IMPACT: (project: string) =>
        `/project/${project}/impact?tab=add-impact`,
    },
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
  REGISTRY: {
    ROOT: `/funding-map`,
    ADD_PROGRAM: `/funding-map/add-program`,
    MANAGE_PROGRAMS: `/funding-map/manage-programs`,
  },
};
