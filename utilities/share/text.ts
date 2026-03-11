import { PROJECT_NAME } from "@/constants/brand";
import { SOCIALS } from "../socials";

export const SHARE_TEXTS = {
  MILESTONE_COMPLETED: (title: string, slugOrUid: string, grantUid: string) =>
    `Just hit a major milestone for my grant from ${title}!\nTrack the progress on ${SOCIALS.X_HANDLE} ${PROJECT_NAME} → https://karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\n\nWould love your thoughts and feedback!`,
  GRANT_UPDATE: (title: string, slugOrUid: string, grantUid: string) =>
    `Just posted a project update for my ${title} via ${SOCIALS.X_HANDLE} ${PROJECT_NAME}!\nOnchain progress, transparent and trackable.\nCheck it out → https://karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\n\nThoughts welcome 🙌`,
  GRANT_COMPLETED: (title: string, slugOrUid: string, grantUid: string) =>
    `Grant complete: ${title} ✅\nWrapped this one onchain with ${SOCIALS.X_HANDLE} ${PROJECT_NAME}.\nSee the final progress → https://karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates`,
  PROJECT_ACTIVITY: (title: string, slugOrUid: string) =>
    `📢 Project activity dropped for ${title}!\nIt’s not just talk—it’s trackable. Onchain, transparent, and live via ${SOCIALS.X_HANDLE} ${PROJECT_NAME} →  https://karmahq.xyz/project/${slugOrUid}/updates\nLet me know what you think!`,
  PROJECT_ENDORSEMENT: (title: string, slugOrUid: string) =>
    `Project ${title} is 🔥!\nEndorsed it on ${SOCIALS.X_HANDLE} to make it known.\nhttps://karmahq.xyz/project/${slugOrUid}`,
  MILESTONE_PENDING: (title: string, slugOrUid: string, grantUid: string) =>
    `Just posted a milestone for my grant from ${title}! Follow along with my progress on ${SOCIALS.X_HANDLE} ${PROJECT_NAME} → https://karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\n\nStay tuned for updates!`,
};
