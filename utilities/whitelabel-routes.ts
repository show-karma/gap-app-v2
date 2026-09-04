/**
 * Clean-URL aliases on whitelabel hosts.
 *
 * Its own module rather than a corner of `pages.ts`: the alias runs in the
 * proxy, in every `Link`, and in the analytics layer, and `pages.ts` is mocked
 * in dozens of component tests — a helper living there would be undefined in
 * any of them that renders a link.
 *
 * Imports nothing, deliberately, for the same reason `community-nav.ts` does
 * not: everything here is consulted from modules those tests already load.
 */

/**
 * A tenant's own name for a section that already has a route.
 *
 * `from` is the clean path a visitor sees and shares; `to` is the community
 * sub-route that serves it, with no redirect and no second copy of the page.
 * A tenant whose vocabulary differs from the product's needs its own URL, not
 * only its own tab label — a link to "Projects Explorer" that lands on
 * `/browse-applications` reads as the wrong page before it has finished
 * loading.
 */
type WhitelabelRouteAlias = {
  readonly from: string;
  readonly to: string;
  /**
   * Community slugs the alias belongs to. It is one tenant's vocabulary, not a
   * second URL the whole product grows: without this list every whitelabel
   * host would answer 200 at a path its own navigation never mentions.
   */
  readonly communities: readonly string[];
};

/**
 * Clean-URL aliases, applied on whitelabel hosts only.
 *
 * Aliasing rather than a second route keeps one listing, one component and one
 * set of tests, and leaves `/browse-applications` working for everyone who
 * already has that link.
 *
 * Not applied on karmahq.org, deliberately: there the same alias would put a
 * second URL in front of one page for every community at once, which is a
 * duplicate for search engines and a second answer to "where does this live".
 */
export const WHITELABEL_ROUTE_ALIASES: readonly WhitelabelRouteAlias[] = [
  { from: "/browse-projects", to: "/browse-applications", communities: ["filecoin"] },
];

/**
 * Resolves a whitelabel clean path through {@link WHITELABEL_ROUTE_ALIASES} for
 * the community whose host it arrived on, sub-paths included
 * (`/browse-projects/APP-1` -> `/browse-applications/APP-1`), so an alias
 * covers a section rather than a single URL. Returns the path unchanged when
 * nothing matches.
 */
export function resolveWhitelabelRouteAlias(path: string, communitySlug: string): string {
  for (const { from, to, communities } of WHITELABEL_ROUTE_ALIASES) {
    if (!communities.includes(communitySlug)) continue;
    if (path === from || path === `${from}/`) return to;
    if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  }
  return path;
}

/**
 * The inverse: the alias a whitelabel link should point at, given the path the
 * app built.
 *
 * Components address this listing as `PAGES.COMMUNITY.BROWSE_APPLICATIONS`, and
 * a tenant that renamed it should not have to be known to each of them. Turning
 * the link on the way out is what keeps a rename to one URL rather than two —
 * without it a visitor reaches the tab at `/browse-projects` and the very next
 * click puts `/browse-applications` in their history for the same screen.
 *
 * Only ever called with an already-stripped whitelabel path (see the `Link`
 * component); on the canonical host the alias does not resolve, so nothing may
 * apply it there.
 */
export function toWhitelabelRouteAlias(path: string, communitySlug: string): string {
  for (const { from, to, communities } of WHITELABEL_ROUTE_ALIASES) {
    if (!communities.includes(communitySlug)) continue;
    if (path === to) return from;
    if (path.startsWith(`${to}/`) || path.startsWith(`${to}?`)) {
      return `${from}${path.slice(to.length)}`;
    }
  }
  return path;
}
