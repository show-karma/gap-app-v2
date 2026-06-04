export type AskKarmaTopicIcon =
  | "dollar"
  | "trending-up"
  | "settings"
  | "document"
  | "chart"
  | "back"
  | "sparkles"
  | "info"
  | "users"
  | "compass";

export interface AskKarmaLink {
  label: string;
  /**
   * Destination URL. Omit (or leave empty) to render the entry as a muted,
   * non-navigable label — used for "coming soon" items that should appear
   * in the list but not link anywhere yet.
   */
  href?: string;
  isExternal?: boolean;
}

export interface AskKarmaTopic {
  icon: AskKarmaTopicIcon;
  title: string;
  description?: string;
  links?: AskKarmaLink[];
  // CTAs always need a destination — there's no "coming soon" CTA, the
  // whole point is the call to action. Narrow the link type accordingly
  // so consumers don't need to defend against an undefined href.
  cta?: AskKarmaLink & { href: string };
}

/**
 * Audience the start-screen prompts are tailored to. Resolved at runtime from
 * the visitor's sign-in state and role:
 * - `visitor`  — signed out; discovery-oriented questions
 * - `reviewer` — signed in and a reviewer of at least one program
 * - `grantee`  — signed in, default for everyone who isn't a reviewer
 */
export type AskKarmaPersona = "visitor" | "reviewer" | "grantee";

export interface AskKarmaConfig {
  heading: string;
  subheading: string;
  inputPlaceholder: string;
  examplesIntro: string;
  /**
   * Fallback prompt list, shown when a tenant doesn't define
   * `exampleQuestionsByPersona` or a persona is missing from it.
   */
  exampleQuestions: string[];
  /**
   * Persona-tailored prompt lists. When present, the start screen picks the
   * set matching the visitor's sign-in state and role (see `AskKarmaPersona`),
   * falling back to `exampleQuestions` for any persona left undefined.
   */
  exampleQuestionsByPersona?: Partial<Record<AskKarmaPersona, string[]>>;
  featuredTopicsHeading: string;
  featuredTopics: AskKarmaTopic[];
  assistantTitle: string;
  assistantSubtitle: string;
}
