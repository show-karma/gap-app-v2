/**
 * Formats a milestone title with a "Milestone N:" prefix.
 * Uses 0-based index input, displays as 1-based.
 *
 * @param index - 0-based position of the milestone in the list
 * @param title - The milestone's original title
 * @returns Formatted string like "Milestone 1: Setup infrastructure"
 */
export function formatMilestoneTitle(index: number, title: string): string {
  const number = index + 1;
  const trimmed = title.trim();

  if (!trimmed) {
    return `Milestone ${number}`;
  }

  // Avoid double-prefixing if title already starts with "Milestone N"
  const milestonePrefix = new RegExp(`^Milestone\\s+${number}(\\s*:|$)`);
  if (milestonePrefix.test(trimmed)) {
    return trimmed;
  }

  return `Milestone ${number}: ${trimmed}`;
}
