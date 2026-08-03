/**
 * Proxy tagging for the find-funders crawler hero (DEV-586).
 *
 * The root layout renders a <noscript> hero for /nonprofits/find-funders —
 * the only region of a streamed response guaranteed into the initially
 * visible HTML — and it decides via the `x-pathname` request header, because
 * layouts cannot read the pathname on their own. This pins the proxy half of
 * that contract: the header is set on exactly that path and on no other.
 */
import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

const nextCalls: Array<{ request?: { headers: Headers } } | undefined> = [];

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
      next: (opts?: { request?: { headers: Headers } }) => {
        nextCalls.push(opts);
        return { headers: new Headers(), status: 200, __opts: opts };
      },
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

const STANDARD_HOST = "www.karmahq.xyz";

const createRequest = (path: string) => {
  const requestUrl = new URL(`https://${STANDARD_HOST}${path}`);

  return {
    nextUrl: {
      pathname: path,
      protocol: requestUrl.protocol,
      search: requestUrl.search,
      searchParams: requestUrl.searchParams,
      clone: () => new URL(requestUrl.toString()),
    },
    headers: new Headers({ host: STANDARD_HOST }),
    url: requestUrl.toString(),
  } as unknown as NextRequest;
};

async function proxiedRequestHeaders(path: string): Promise<Headers | undefined> {
  nextCalls.length = 0;
  await proxy(createRequest(path));
  return nextCalls.at(-1)?.request?.headers;
}

describe("proxy x-pathname tagging for the find-funders noscript hero", () => {
  it("tags /nonprofits/find-funders with its own pathname", async () => {
    const headers = await proxiedRequestHeaders("/nonprofits/find-funders");

    expect(headers?.get("x-pathname")).toBe("/nonprofits/find-funders");
  });

  it.each([
    "/nonprofits",
    "/nonprofits/find-funders/connect",
    "/nonprofits/find-funders/search/abc",
    "/communities",
    "/seeds",
  ])("does not tag %s", async (path) => {
    const headers = await proxiedRequestHeaders(path);

    expect(headers?.get("x-pathname") ?? null).toBeNull();
  });
});
