import type { Feed } from "@/types";

import { PAGES } from "./pages";

const feedIcons = {
  project: "/icons/newIcons/icon_folder.svg",
  milestone: "/icons/newIcons/icon_flag.svg",
  grant: "/icons/newIcons/icon_money.svg",
  member: "/icons/newIcons/icon_added.svg",
  community: "/icons/newIcons/icon_added.svg",
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
    return "/icons/newIcons/icon_edit.svg";
  }

  if (event === "milestone-completed") {
    return "/icons/milestone-completed.svg";
  }
  if (event === "milestone-rejected") {
    return "/icons/newIcons/icon_thumbs-down.svg";
  }
  if (event === "milestone-approved") {
    return "/icons/newIcons/icon_thumbs-up.svg";
  }
  if (event === "grant-completed") {
    return "/icons/newIcons/icon_thumbs-up.svg";
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
