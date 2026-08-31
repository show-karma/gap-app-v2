interface OpenableRow {
  grantUid: string;
  projectSlug: string;
}

/**
 * Picks the table row the Control Center should auto-open from URL params.
 * A project can hold grants in several programs, so `grant` selects the exact
 * row; without it (or if it doesn't match) the first row for the slug wins.
 */
export function findGrantRowToOpen<T extends OpenableRow>(
  rows: T[],
  projectSlug: string,
  grantUid?: string
): T | undefined {
  const rowsForProject = rows.filter((row) => row.projectSlug === projectSlug);
  return rowsForProject.find((row) => row.grantUid === grantUid) ?? rowsForProject[0];
}
