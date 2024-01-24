import type { Feed } from "@/types";

import { PAGES } from "./pages";

const feedIcons = {
  project: "/icons/project-added.svg",
  milestone: "/icons/milestone-added.svg",
  grant: "/icons/grant-added.svg",
  member: "/icons/member-added.svg",
  community: "/icons/member-added.svg",
};

export const feedIconDictionary = (
  event: Feed["event"],
  type: Feed["type"]
) => {
  if (event === "revoked") {
    return "/icons/revoked.svg";
  }
  if (event === "created" || event === "member-added") {
    return feedIcons[type];
  }
  if (event === "deleted") {
    return "/icons/deleted.svg";
  }
  if (event === "updated") {
    return "/icons/updated.svg";
  }

  if (event === "milestone-completed") {
    return "/icons/milestone-completed.svg";
  }
  if (event === "milestone-rejected") {
    return "/icons/rejected.svg";
  }
  if (event === "milestone-approved") {
    return "/icons/approved.svg";
  }
  if (event === "grant-completed") {
    return "/icons/approved.svg";
  }
  return "/icons/review.svg";
};

export const getFeedHref = (item: Feed) => {
  if (item.type === "project")
    return PAGES.PROJECT.OVERVIEW(item.projectUID || item.uid);
  if (item.type === "member" && item.projectUID)
    return PAGES.PROJECT.TEAM(item.projectUID);
  if (item.type === "grant")
    return PAGES.PROJECT.GRANT(item.projectUID as string, item.uid);
  if (item.type === "milestone" && item.projectUID && item.grantUID) {
    return PAGES.PROJECT.GRANT(item.projectUID, item.grantUID);
  }
  if (item.type === "community") {
    return PAGES.COMMUNITY.ALL_GRANTS(item.uid);
  }
  return "";
};
