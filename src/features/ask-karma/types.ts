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

export interface AskKarmaConfig {
  heading: string;
  subheading: string;
  inputPlaceholder: string;
  examplesIntro: string;
  exampleQuestions: string[];
  featuredTopicsHeading: string;
  featuredTopics: AskKarmaTopic[];
  assistantTitle: string;
  assistantSubtitle: string;
}
