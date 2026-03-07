import type { CommentAuthorRole } from "./types";

export const ROLE_BADGE_CONFIG: Record<
  CommentAuthorRole,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  admin: { variant: "secondary", label: "Admin" },
  reviewer: { variant: "default", label: "Reviewer" },
  applicant: { variant: "outline", label: "Applicant" },
  community: { variant: "outline", label: "Community" },
};
