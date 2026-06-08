import type { Metadata } from "next";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

/**
 * Self-referential canonical for a community sub-page.
 *
 * Mirrors the community layout's whitelabel handling: on a whitelabel domain
 * the `/community/<slug>` prefix is stripped from URLs, so the canonical is the
 * bare sub-path; on the main site it is the full `/community/<slug>/<subpath>`.
 *
 * Returning only `alternates` keeps the title/description the page inherits from
 * the community layout and just corrects the canonical — used to replace pages
 * that previously set `defaultMetadata` (whose canonical is the homepage "/").
 */
export async function communitySubpageMetadata(
  communityId: string,
  subpath: string
): Promise<Metadata> {
  const { isWhitelabel } = await getWhitelabelContext();
  const canonical = isWhitelabel ? `/${subpath}` : `/community/${communityId}/${subpath}`;
  return { alternates: { canonical } };
}
