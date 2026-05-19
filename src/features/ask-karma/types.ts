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
  href: string;
  isExternal?: boolean;
}

export interface AskKarmaTopic {
  icon: AskKarmaTopicIcon;
  title: string;
  description?: string;
  links?: AskKarmaLink[];
  cta?: AskKarmaLink;
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
