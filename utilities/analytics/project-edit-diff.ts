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
 * Reduces a value to a form where equal means unchanged.
 *
 * Three things happen here, and the order of the first two is the whole point.
 *
 * **Blank is blank.** Missing, null, empty and whitespace-only all mean "not
 * filled in". Without that, clearing an already-empty optional field reads as a
 * change on every submit, and every project that has never set `problem`
 * reports it as edited each time anything else is.
 *
 * **Scalars are normalised BEFORE anything is filtered out.** A nested member
 * holding `"   "` is not blank by identity, so filtering first kept it — and it
 * then canonicalised to `""`, which is exactly what a missing member had been
 * dropped for being. One survived as an empty entry and the other vanished, so
 * the two compared unequal and produced a diff nobody made.
 *
 * **Order does not count** for tags and custom links: the form rebuilds those
 * arrays from scratch on every render, so their order is an artefact of the UI
 * rather than something the user changed. A member or element that reduces to
 * nothing is dropped at that point — a blank custom-link row the form left
 * behind is not a link.
 */
const canonical = (value: unknown): string => {
  if (value === undefined || value === null) return "";

  if (Array.isArray(value)) {
    const items: string[] = [];
    for (const item of value) {
      const reduced = canonical(item);
      if (reduced !== "") items.push(reduced);
    }
    items.sort();
    // An empty container reduces to the same nothing as a missing one — the
    // form always submits an array where the stored entity may simply omit it.
    return items.length === 0 ? "" : JSON.stringify(items);
  }

  if (typeof value === "object") {
    const entries: (readonly [string, string])[] = [];
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const reduced = canonical(entry);
      if (reduced !== "") entries.push([key, reduced] as const);
    }
    entries.sort(([a], [b]) => a.localeCompare(b));
    // Likewise an object whose every member is blank: an empty custom-link row
    // the form left behind is not a link, and must not read as one.
    return entries.length === 0 ? "" : JSON.stringify(entries);
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
    customLinks: links.reduce<{ name: string; url: string }[]>((custom, link) => {
      if (link.type === "custom") {
        custom.push({ name: (link as { name?: string }).name ?? "", url: link.url ?? "" });
      }
      return custom;
    }, []),
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
