import type { ExternalCustomLink } from "@show-karma/karma-gap-sdk";

export type CustomLink = {
  id: string;
  name: string;
  url: string;
};

export function isCustomLink(link: any): link is ExternalCustomLink {
  return typeof link.name === "string" && typeof link.url === "string";
}
