import type { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { tenantNavigation } from "@/src/infrastructure/config/tenant-navigation-config";
import { EXPLORER_NAV_OVERRIDES } from "@/utilities/community-flags";
import { CANONICAL_HOST } from "@/utilities/domains";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";

/**
 * `/browse-projects` is the URL a tenant that funds "projects" rather than
 * "applications" puts in its header, its navbar and its explorer tab. It has no
 * route of its own on purpose — one listing, one component, one set of tests —
 * so the whitelabel rewrite has to resolve it onto `browse-applications`
 * *without* redirecting: the alias is the URL the visitor keeps and shares.
 *
 * These pin both halves of that: the alias resolves on a tenant host, and it
 * does not exist anywhere else.
 */

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      redirect: (url: URL, status?: number) => {
        const headers = new Headers();
        headers.set("location", url.toString());
        return { headers, status };
      },
      rewrite: (url: URL, _opts?: unknown) => {
        const headers = new Headers();
        headers.set("x-middleware-rewrite", url.toString());
        return { headers, status: 200 };
      },
      next: (_opts?: unknown) => ({ headers: new Headers(), status: 200 }),
    },
  };
});

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

const filecoinWhitelabel = WHITELABEL_DOMAINS.find((entry) => entry.domain === "app.filpgf.io");

const createRequest = (pathWithQuery: string, host: string) => {
  const requestUrl = new URL(`https://${host}${pathWithQuery}`);

  return {
    nextUrl: {
      pathname: requestUrl.pathname,
      protocol: requestUrl.protocol,
      search: requestUrl.search,
      clone: () => new URL(requestUrl.toString()),
    },
    headers: new Headers({ host }),
    url: requestUrl.toString(),
  } as NextRequest;
};

describe("whitelabel route aliases", () => {
  if (!filecoinWhitelabel) {
    throw new Error("app.filpgf.io is missing from WHITELABEL_DOMAINS.");
  }
  const host = filecoinWhitelabel.domain;
  const slug = filecoinWhitelabel.communitySlug;

  const respond = (pathWithQuery: string, requestHost = host) =>
    proxy(createRequest(pathWithQuery, requestHost));

  it("serves /browse-projects from the browse-applications route", async () => {
    const response = await respond("/browse-projects");

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/community/${slug}/browse-applications`
    );
  });

  it("rewrites rather than redirects, so the visitor keeps the alias URL", async () => {
    const response = await respond("/browse-projects");

    expect(response?.headers.get("location")).toBeNull();
  });

  it("preserves the filter query the explorer round-trips through the URL", async () => {
    const response = await respond("/browse-projects?trackIds=track-1,track-2&status=approved");

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/community/${slug}/browse-applications?trackIds=track-1,track-2&status=approved`
    );
  });

  it("carries a sub-path across, so a linked application still resolves", async () => {
    const response = await respond("/browse-projects/APP-1AB2CD3E-XY45");

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/community/${slug}/browse-applications/APP-1AB2CD3E-XY45`
    );
  });

  it("leaves the underlying /browse-applications URL working", async () => {
    const response = await respond("/browse-applications");

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/community/${slug}/browse-applications`
    );
  });

  // The route the alias sits next to, and the one a careless alias key would
  // swallow: /projects is the funded-grants listing, a different page.
  it("leaves /projects rewriting to the funded-projects listing", async () => {
    const response = await respond("/projects");

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/community/${slug}/projects`
    );
  });

  // The alias is a tenant's own name for the listing. On the canonical host the
  // same page is reached at /community/<slug>/browse-applications, and adding a
  // second URL for it there would be a duplicate for every community at once.
  it("does not exist on the canonical host", async () => {
    const response = await respond("/browse-projects", CANONICAL_HOST);

    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response?.headers.get("location")).toBeNull();
  });

  // The navbar entry and the tab have to name the same URL — that agreement is
  // the whole point of the change, and a navbar href is exactly the kind of
  // line an unrelated navigation edit retypes.
  it("is where the tenant navbar's Projects Explorer points", () => {
    const funding = tenantNavigation.filecoin?.items?.find((item) => item.label === "Funding");
    const explorer = funding?.items?.find((item) => item.label === "Projects Explorer");

    expect(explorer?.href).toBe("/browse-projects");
    expect(EXPLORER_NAV_OVERRIDES.filecoin?.tabPaths?.["browse-applications"]).toBe(explorer?.href);
  });

  // Nor on another tenant's host: this is one community's word for the listing,
  // not a second URL every whitelabel host quietly grows.
  it("does not exist on a whitelabel host for another community", async () => {
    const other = WHITELABEL_DOMAINS.find((entry) => entry.communitySlug !== slug);
    if (!other) {
      throw new Error("Expected a second community among WHITELABEL_DOMAINS.");
    }

    const response = await respond("/browse-projects", other.domain);

    // Not a community sub-route segment there, so it passes through untouched
    // and the app answers its own 404 — no rewrite onto browse-applications.
    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response?.headers.get("location")).toBeNull();
  });
});
