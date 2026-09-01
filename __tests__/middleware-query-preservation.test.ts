import type { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { CANONICAL_HOST, CANONICAL_ORIGIN, LEGACY_UMBRELLA_HOSTS } from "@/utilities/domains";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";

/**
 * Every redirect out of proxy.ts must carry the request's query string.
 *
 * The .xyz -> .org migration shipped with several hops that rebuilt the target
 * from a path string and silently dropped it, so UTM attribution and
 * invite/referral tokens died on exactly the hosts whose only job is forwarding
 * inbound links. These tests pin the query onto each of those hops.
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
  chosenCommunities: () => [{ slug: "a-chosen-community", uid: "0xchosen" }],
}));

const QUERY = "?utm_source=newsletter&ref=invite-token";

/**
 * Unlike the shared helper in middleware-dashboard.test.ts, this one splits the
 * query off the pathname — a `pathname` still carrying `?a=b` would make every
 * assertion below pass for the wrong reason.
 */
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

const locationOf = async (pathWithQuery: string, host: string) => {
  const response = await proxy(createRequest(pathWithQuery, host));
  return response?.headers.get("location");
};

describe("legacy umbrella host preserves the query", () => {
  const UMBRELLA = LEGACY_UMBRELLA_HOSTS.prod;
  const tenant = WHITELABEL_DOMAINS.find((domain) => domain.isProduction !== false);

  it("keeps the query when forwarding a /community/... path to the main site", async () => {
    const location = await locationOf(`/community/gitcoin${QUERY}`, UMBRELLA);

    expect(location).toBe(`${CANONICAL_ORIGIN}/community/gitcoin${QUERY}`);
  });

  it("keeps the query when forwarding an unknown slug to /community/<slug>", async () => {
    const location = await locationOf(`/some-unknown-slug/programs${QUERY}`, UMBRELLA);

    expect(location).toBe(`${CANONICAL_ORIGIN}/community/some-unknown-slug/programs${QUERY}`);
  });

  it("keeps the query when forwarding the root path", async () => {
    const location = await locationOf(`/${QUERY}`, UMBRELLA);

    expect(location).toBe(`${CANONICAL_ORIGIN}/${QUERY}`);
  });

  it("keeps the query when handing a known tenant off to its whitelabel domain", async () => {
    if (!tenant) {
      throw new Error("No production whitelabel domain configured for middleware tests.");
    }

    const location = await locationOf(`/${tenant.communitySlug}/programs${QUERY}`, UMBRELLA);

    expect(location).toContain(QUERY);
    expect(location).toContain(tenant.domain);
  });
});

describe("canonical host preserves the query", () => {
  it("keeps the query on /my-projects", async () => {
    const location = await locationOf(`/my-projects${QUERY}`, CANONICAL_HOST);

    expect(location).toBe(`https://${CANONICAL_HOST}/dashboard/projects${QUERY}`);
  });

  it("keeps the query on /my-reviews", async () => {
    const location = await locationOf(`/my-reviews${QUERY}`, CANONICAL_HOST);

    expect(location).toBe(`https://${CANONICAL_HOST}/dashboard/reviews${QUERY}`);
  });

  it("keeps the query when expanding a chosen community slug to /community/<slug>", async () => {
    const location = await locationOf(`/a-chosen-community${QUERY}`, CANONICAL_HOST);

    expect(location).toBe(`https://${CANONICAL_HOST}/community/a-chosen-community${QUERY}`);
  });
});

describe("alias collapse preserves the query", () => {
  it("keeps the query on the single 308 to the canonical host", async () => {
    const location = await locationOf(`/funding-map${QUERY}`, "gap.karmahq.xyz");

    expect(location).toBe(`${CANONICAL_ORIGIN}/funding-map${QUERY}`);
  });
});
