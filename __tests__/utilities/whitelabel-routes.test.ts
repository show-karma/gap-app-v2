import { EXPLORER_NAV_OVERRIDES } from "@/utilities/community-flags";
import { COMMUNITY_SUB_ROUTE_SEGMENTS } from "@/utilities/pages";
import {
  resolveWhitelabelRouteAlias,
  toWhitelabelRouteAlias,
  WHITELABEL_ROUTE_ALIASES,
} from "@/utilities/whitelabel-routes";

/**
 * A tenant's own name for a section it already has. The alias is served by a
 * rewrite, so the URL a visitor keeps is the tenant's word for the page — which
 * only works while three tables agree: the alias, the explorer tab it belongs
 * to, and the route that actually serves it.
 */
describe("whitelabel route aliases", () => {
  it("resolves an alias to the route that serves it", () => {
    expect(resolveWhitelabelRouteAlias("/browse-projects", "filecoin")).toBe(
      "/browse-applications"
    );
  });

  it("resolves the trailing-slash form too", () => {
    expect(resolveWhitelabelRouteAlias("/browse-projects/", "filecoin")).toBe(
      "/browse-applications"
    );
  });

  it("carries sub-paths across, so an alias covers a section", () => {
    expect(resolveWhitelabelRouteAlias("/browse-projects/APP-1AB2CD3E-XY45", "filecoin")).toBe(
      "/browse-applications/APP-1AB2CD3E-XY45"
    );
  });

  it("leaves a path that only starts with the alias alone", () => {
    // A route named /browse-projects-archive is a different route, not a
    // sub-path of the alias.
    expect(resolveWhitelabelRouteAlias("/browse-projects-archive", "filecoin")).toBe(
      "/browse-projects-archive"
    );
  });

  it("leaves an unaliased path untouched", () => {
    expect(resolveWhitelabelRouteAlias("/browse-applications", "filecoin")).toBe(
      "/browse-applications"
    );
    expect(resolveWhitelabelRouteAlias("/impact", "filecoin")).toBe("/impact");
    expect(resolveWhitelabelRouteAlias("/", "filecoin")).toBe("/");
  });

  // An alias is one tenant's word for a section. Left unscoped it would make
  // every whitelabel host answer 200 at a path its own navigation never
  // mentions, which is how a URL nobody owns ends up indexed.
  it("belongs to its own tenant and no other", () => {
    expect(resolveWhitelabelRouteAlias("/browse-projects", "optimism")).toBe("/browse-projects");
    expect(resolveWhitelabelRouteAlias("/browse-projects", "polygon")).toBe("/browse-projects");
  });

  // The rewrite prepends /community/<slug> only to a known sub-route segment,
  // so an alias whose target is not one would resolve and then fall through
  // to a 404 on the tenant host.
  it("targets a real community sub-route", () => {
    for (const { to } of WHITELABEL_ROUTE_ALIASES) {
      expect(COMMUNITY_SUB_ROUTE_SEGMENTS.has(to.split("/")[1] ?? "")).toBe(true);
    }
  });

  // The alias resolves before the proxy consults the route segments, so a key
  // that names a real route would rewrite that route away — permanently, on
  // every tenant host, and only there. It would read as "the new page works on
  // karmahq.org but shows the wrong thing on the tenant domain".
  it("does not shadow a real community sub-route", () => {
    for (const { from } of WHITELABEL_ROUTE_ALIASES) {
      expect(COMMUNITY_SUB_ROUTE_SEGMENTS.has(from.split("/")[1] ?? "")).toBe(false);
    }
  });

  // Two tables have to agree for the tab to work: the explorer tab's
  // destination (community-flags) and the alias that resolves it (here). A
  // rename in one without the other is a tab that 404s on its own host.
  it("is the destination the explorer tab actually links to", () => {
    for (const { from, communities } of WHITELABEL_ROUTE_ALIASES) {
      for (const community of communities) {
        const tabPaths = EXPLORER_NAV_OVERRIDES[community]?.tabPaths ?? {};
        expect(Object.values(tabPaths)).toContain(from);
      }
    }
  });

  describe("the outbound direction", () => {
    it("turns a link into the tenant's own name for the section", () => {
      expect(toWhitelabelRouteAlias("/browse-applications", "filecoin")).toBe("/browse-projects");
    });

    it("keeps the query a program card puts on it", () => {
      expect(toWhitelabelRouteAlias("/browse-applications?programId=42", "filecoin")).toBe(
        "/browse-projects?programId=42"
      );
    });

    it("carries the reference a row links to", () => {
      expect(toWhitelabelRouteAlias("/browse-applications/APP-1AB2CD3E-XY45", "filecoin")).toBe(
        "/browse-projects/APP-1AB2CD3E-XY45"
      );
    });

    it("leaves another tenant's links alone", () => {
      expect(toWhitelabelRouteAlias("/browse-applications", "optimism")).toBe(
        "/browse-applications"
      );
    });

    it("leaves an unrelated path alone", () => {
      expect(toWhitelabelRouteAlias("/impact", "filecoin")).toBe("/impact");
      expect(toWhitelabelRouteAlias("/browse-applications-archive", "filecoin")).toBe(
        "/browse-applications-archive"
      );
    });

    it("round-trips with the inbound direction", () => {
      for (const { from, to, communities } of WHITELABEL_ROUTE_ALIASES) {
        for (const community of communities) {
          expect(
            resolveWhitelabelRouteAlias(toWhitelabelRouteAlias(to, community), community)
          ).toBe(to);
          expect(
            toWhitelabelRouteAlias(resolveWhitelabelRouteAlias(from, community), community)
          ).toBe(from);
        }
      }
    });
  });
});
