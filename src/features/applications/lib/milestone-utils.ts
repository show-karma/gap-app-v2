export const MILESTONE_CORE_FIELDS = [
  "title",
  "description",
  "dueDate",
  "completed",
  "fundingRequested",
  // Internal — surfaced in the API response so the frontend can match
  // application milestones to their on-chain counterparts, but never
  // user-facing.
  "milestoneUID",
];

export const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export const isMarkdownContent = (val: string): boolean => {
  return (
    val.includes("\n") ||
    val.includes("**") ||
    val.includes("##") ||
    val.includes("- ") ||
    val.includes("* ") ||
    val.includes("`") ||
    val.length > 100
  );
};
