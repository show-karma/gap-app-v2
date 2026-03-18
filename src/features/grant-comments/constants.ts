import type { GrantCommentAuthorRole } from "./types";

export const GRANT_ROLE_BADGE_CONFIG: Record<
  GrantCommentAuthorRole,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  admin: { variant: "secondary", label: "Admin" },
  reviewer: { variant: "default", label: "Reviewer" },
};
