import { SOCIALS } from "../socials";

export const SHARE_TEXTS = {
  MILESTONE_COMPLETED: (title: string, slugOrUid: string, grantUid: string) =>
    `Just hit a major milestone for my grant from ${title}!\Track the progress on ${SOCIALS.X_HANDLE} GAP → https://gap.karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\n\nWould love your thoughts and feedback!`,
  GRANT_UPDATE: (title: string, slugOrUid: string, grantUid: string) =>
    `Just posted a project update for my ${title} via ${SOCIALS.X_HANDLE} GAP!\nOnchain progress, transparent and trackable.\nCheck it out → https://gap.karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\n\nThoughts welcome 🙌`,
  PROJECT_ACTIVITY: (title: string, slugOrUid: string) =>
    `📢 Project update dropped for ${title}!\nIt’s not just talk—it’s trackable. Onchain, transparent, and live via ${SOCIALS.X_HANDLE} GAP →  https://gap.karmahq.xyz/project/${slugOrUid}/roadmap\nLet me know what you think!`,
  PROJECT_ENDORSEMENT: (title: string, slugOrUid: string) =>
    `Project ${title} is 🔥!\nEndorsed it on ${SOCIALS.X_HANDLE} to make it known.\nhttps://gap.karmahq.xyz/project/${slugOrUid}`,
};
