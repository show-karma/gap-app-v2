/**
 * Utility functions for project lookup operations.
 * These functions help with finding projects by various identifiers (slug or UID).
 */

export interface ProjectData {
  uid: string;
  slug?: string;
  title: string;
}

export interface ProjectOption {
  title: string;
  value: string;
}

/**
 * Finds a project by either its slug or UID.
 * This supports both modern slug-based URLs and legacy UID-based URLs.
 *
 * @param projects - Array of project data
 * @param identifier - The slug or UID to search for
 * @returns The matching project or undefined if not found
 */
export function findProjectBySlugOrUid(
  projects: ProjectData[] | undefined,
  identifier: string | null
): ProjectData | undefined {
  if (!projects || !identifier) {
    return undefined;
  }

  return projects.find((project) => project.slug === identifier || project.uid === identifier);
}

/**
 * Converts a project data object to a project option for dropdowns.
 * The value prefers slug over uid for URL-friendly values.
 *
 * @param project - The project data object
 * @returns A project option with title and value
 */
export function projectToOption(project: ProjectData): ProjectOption {
  return {
    title: project.title,
    value: project.slug || project.uid,
  };
}

/**
 * Converts an array of project data to project options for dropdowns.
 *
 * @param projects - Array of project data
 * @returns Array of project options
 */
export function projectsToOptions(projects: ProjectData[] | undefined): ProjectOption[] {
  if (!projects) {
    return [];
  }

  return projects.map(projectToOption);
}

/**
 * Finds a project and returns it as a dropdown option.
 * Supports both slug and UID lookups for backward compatibility with legacy URLs.
 *
 * @param projects - Array of project data
 * @param identifier - The slug or UID to search for
 * @returns The matching project option or undefined if not found
 */
export function findProjectOptionBySlugOrUid(
  projects: ProjectData[] | undefined,
  identifier: string | null
): ProjectOption | undefined {
  const project = findProjectBySlugOrUid(projects, identifier);

  if (!project) {
    return undefined;
  }

  return projectToOption(project);
}
