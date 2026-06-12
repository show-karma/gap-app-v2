import type { ExternalCustomLink } from "@show-karma/karma-gap-sdk";

export type CustomLink = {
  id: string;
  name: string;
  url: string;
};

export function isCustomLink(link: unknown): link is ExternalCustomLink {
  if (!link || typeof link !== "object") {
    return false;
  }
  const candidate = link as { name?: unknown; url?: unknown };
  return typeof candidate.name === "string" && typeof candidate.url === "string";
}
