export const SHARE_TEXTS = {
  MILESTONE_COMPLETED: (title: string, slugOrUid: string, grantUid: string) =>
    `🚀 Just hit a major milestone of my grant from ${title}!\nCheck out my progress on @karmahq_ GAP and and see how we’re advancing: https://gap.karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\nYour thoughts and feedback are invaluable—let me know what you think!`,
  GRANT_UPDATE: (title: string, slugOrUid: string, grantUid: string) =>
    `🚀 Just posted an update for my grant from ${title}!\nCheck out my progress on @karmahq_ GAP and and see how we’re advancing: https://gap.karmahq.xyz/project/${slugOrUid}/funding?grantId=${grantUid}&tab=milestones-and-updates\nYour thoughts and feedback are invaluable—let me know what you think!`,
  PROJECT_ACTIVITY: (title: string, slugOrUid: string) =>
    `🚀 Just posted an project activity for ${title}!\nCheck out my progress on @karmahq_ GAP and and see how we’re advancing: https://gap.karmahq.xyz/project/${slugOrUid}?tab=updates\nYour thoughts and feedback are invaluable—let me know what you think!`,
  PROJECT_ENDORSEMENT: (title: string, slugOrUid: string) =>
    `🚀 Just endorsed ${title}!\nhttps://gap.karmahq.xyz/project/${slugOrUid}`,
};
