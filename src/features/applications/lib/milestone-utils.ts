export const MILESTONE_CORE_FIELDS = [
  "title",
  "description",
  "dueDate",
  "completed",
  "fundingRequested",
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

/**
 * Represents a milestone with at least a `title` property.
 */
interface HasTitle {
  title: string;
}

/**
 * Build a positional map from milestone array index → completion.
 *
 * When N milestones share the same title and M completions exist (M ≤ N),
 * the k-th completion maps to the k-th milestone with that title.
 * This prevents a single completion from being matched to every duplicate milestone.
 *
 * @param milestones - The milestone definitions (in order)
 * @param completions - The completion records returned by the server
 * @param fieldLabel - The field label for the current milestone group
 * @returns Map<number, Completion | null> where key is milestone array index
 */
export function buildPositionalCompletionMap<
  T extends { milestoneFieldLabel?: string; milestoneTitle?: string },
>(milestones: HasTitle[], completions: T[], fieldLabel: string): Map<number, T | null> {
  const map = new Map<number, T | null>();
  const consumed = new Map<string, number>();

  const normalizedField = fieldLabel?.trim() ?? "";

  for (let index = 0; index < milestones.length; index++) {
    const milestone = milestones[index];
    const normalizedTitle = milestone.title?.trim() ?? "";
    const key = `${normalizedField}::${normalizedTitle}`;
    const consumedCount = consumed.get(key) ?? 0;

    const matching = completions.filter(
      (c) =>
        (c.milestoneFieldLabel?.trim() ?? "") === normalizedField &&
        (c.milestoneTitle?.trim() ?? "") === normalizedTitle
    );

    if (consumedCount < matching.length) {
      map.set(index, matching[consumedCount]);
      consumed.set(key, consumedCount + 1);
    } else {
      map.set(index, null);
    }
  }

  return map;
}
