export enum Permission {
  COMMUNITY_VIEW = "community:view",
  COMMUNITY_EDIT = "community:edit",
  COMMUNITY_MANAGE_MEMBERS = "community:manage_members",
  COMMUNITY_MANAGE_PROGRAMS = "community:manage_programs",

  PROGRAM_VIEW = "program:view",
  PROGRAM_EDIT = "program:edit",
  PROGRAM_MANAGE_REVIEWERS = "program:manage_reviewers",
  PROGRAM_VIEW_ANALYTICS = "program:view_analytics",

  APPLICATION_VIEW_OWN = "application:view_own",
  APPLICATION_VIEW_ASSIGNED = "application:view_assigned",
  APPLICATION_VIEW_ALL = "application:view_all",
  APPLICATION_CREATE = "application:create",
  APPLICATION_EDIT_OWN = "application:edit_own",
  APPLICATION_READ = "application:read",
  APPLICATION_COMMENT = "application:comment",
  APPLICATION_REVIEW = "application:review",
  APPLICATION_APPROVE = "application:approve",
  APPLICATION_REJECT = "application:reject",
  APPLICATION_CHANGE_STATUS = "application:change_status",

  MILESTONE_VIEW_OWN = "milestone:view_own",
  MILESTONE_VIEW_ASSIGNED = "milestone:view_assigned",
  MILESTONE_VIEW_ALL = "milestone:view_all",
  MILESTONE_SUBMIT = "milestone:submit",
  MILESTONE_REVIEW = "milestone:review",
  MILESTONE_APPROVE = "milestone:approve",
  MILESTONE_REJECT = "milestone:reject",

  REVIEW_CREATE = "review:create",
  REVIEW_EDIT_OWN = "review:edit_own",
  REVIEW_VIEW_ALL = "review:view_all",
  REVIEW_DELETE_OWN = "review:delete_own",
}

export type PermissionString = Permission | "*" | `${string}:*`;
