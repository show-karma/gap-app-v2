import type { Project } from "@show-karma/karma-gap-sdk";

/**
 * Which fields a project edit actually changed.
 *
 * `project_edited.fields_changed` is supposed to answer "what do people edit?".
 * Reporting the form's whole key set answers "what does the form contain?",
 * which is a constant — the same 21 names on every edit, including the edits
 * that changed nothing at all. A funnel built on that cannot tell a title
 * rename from a full profile rewrite.
 *
 * The comparison has to happen BEFORE `updateProject` runs: it calls
 * `details.setValues(...)` on the very object the previous values would be read
 * from, so a diff taken afterwards is always empty.
 *
 * Field NAMES only. The values are the project's own content — a mission
 * statement, a wallet address in a custom link — and have no place on an event.
 */

/** A social link as the form holds it: one url per platform, plus custom rows. */
export interface ProjectSocialValues {
  discord?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  pitchDeck?: string;
  demoVideo?: string;
  farcaster?: string;
  customLinks?: Array<{ name: string; url: string }>;
}

/** The detail fields the edit form owns, as the form holds them. */
export interface ProjectInfoValues {
  title?: string;
  description?: string;
  problem?: string;
  solution?: string;
  missionSummary?: string;
  locationOfImpact?: string;
  tags?: Array<{ name: string }>;
  businessModel?: string;
  stageIn?: string;
  raisedMoney?: string;
  pathToTake?: string;
  imageURL?: string;
}

export type ProjectEditValues = ProjectInfoValues & ProjectSocialValues;

/** Link types the form exposes as their own field, in the order it lists them. */
const SOCIAL_LINK_TYPES = [
  "discord",
  "github",
  "linkedin",
  "twitter",
  "website",
  "pitchDeck",
  "demoVideo",
  "farcaster",
] as const;

/**
 * A missing value, a null one and an empty string all mean "not filled in".
 * Without this, clearing an already-empty optional field reads as a change on
 * every submit — and every project that has never set `problem` reports it as
 * edited each time anything else is.
 */
const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "";

/**
 * Order-insensitive for tags and custom links: the form rebuilds those arrays
 * from scratch on every render, so their order is an artefact of the UI rather
 * than something the user changed.
 */
const canonical = (value: unknown): string => {
  if (isBlank(value)) return "";
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => canonical(item)).sort());
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => !isBlank(entry))
      .map(([key, entry]) => [key, canonical(entry)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  }
  return String(value).trim();
};

const isSame = (previous: unknown, next: unknown): boolean =>
  canonical(previous) === canonical(next);

/**
 * The project's current values, in the shape the edit form submits, so the two
 * can be compared key by key.
 */
export const currentProjectEditValues = (project: Project): ProjectEditValues => {
  const details = project.details;
  const links = details?.links ?? [];
  const urlOf = (type: string): string =>
    links.find((link) => link.type === type && link.type !== "custom")?.url ?? "";

  const socials = Object.fromEntries(
    SOCIAL_LINK_TYPES.map((type) => [type, urlOf(type)])
  ) as Record<(typeof SOCIAL_LINK_TYPES)[number], string>;

  return {
    title: details?.title,
    description: details?.description,
    problem: details?.problem,
    solution: details?.solution,
    missionSummary: details?.missionSummary,
    locationOfImpact: details?.locationOfImpact,
    tags: details?.tags?.map((tag) => ({ name: tag.name })),
    businessModel: details?.businessModel,
    stageIn: details?.stageIn,
    raisedMoney: details?.raisedMoney,
    pathToTake: details?.pathToTake,
    imageURL: details?.imageURL,
    ...socials,
    customLinks: links
      .filter((link) => link.type === "custom")
      .map((link) => ({ name: (link as { name?: string }).name ?? "", url: link.url ?? "" })),
  };
};

/**
 * The names of the fields whose submitted value differs from the stored one.
 *
 * Only keys present in `next` are considered — the form does not submit fields
 * it does not own, and a field it never touched has not been edited.
 */
export const changedProjectFields = (
  previous: ProjectEditValues,
  next: ProjectEditValues
): string[] =>
  Object.keys(next).filter(
    (key) => !isSame(previous[key as keyof ProjectEditValues], next[key as keyof ProjectEditValues])
  );
