import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Google Search Console HTML-file ownership verification for the www
 * (https://www.karmahq.xyz/) URL-prefix property. GSC fetches the exact file at
 * the site root and checks its body, so the artifact must live in `public/`
 * (served verbatim at `/googleb231020e03517669.html`) and the Next.js
 * middleware matcher must NOT intercept it. This pins both invariants.
 */

// Minimal mocks so importing `config` from the middleware module (which pulls in
// next/server + a couple of helpers) loads cleanly in the node test env.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  class MockNextResponse extends Response {}
  return {
    ...actual,
    NextResponse: Object.assign(MockNextResponse, {
      redirect: (url: URL | string, status?: number) => {
        const response = new Response(null, { status: status ?? 307 });
        response.headers.set("location", url.toString());
        return response;
      },
      next: () => new Response(null, { status: 200 }),
      rewrite: (url: URL) => {
        const response = new Response(null, { status: 200 });
        response.headers.set("x-middleware-rewrite", url.toString());
        return response;
      },
    }),
  };
});

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

import { config } from "@/middleware";

const VERIFICATION_FILENAME = "googleb231020e03517669.html";
const VERIFICATION_PATH = path.resolve(__dirname, "../../public", VERIFICATION_FILENAME);
// GSC's file body is `google-site-verification: <filename>`; a single trailing
// newline is preserved verbatim by static serving and is what we commit.
const EXPECTED_BODY = `google-site-verification: ${VERIFICATION_FILENAME}\n`;

describe(`public/${VERIFICATION_FILENAME} (GSC www verification)`, () => {
  it("exists at the apex /googleb231020e03517669.html path", () => {
    expect(fs.existsSync(VERIFICATION_PATH)).toBe(true);
  });

  it("has the exact GSC verification body (UTF-8)", () => {
    const contents = fs.readFileSync(VERIFICATION_PATH, "utf-8");
    expect(contents).toBe(EXPECTED_BODY);
  });
});

describe("middleware matcher (static verification file)", () => {
  it("cannot intercept the dotted root verification file", () => {
    // Next runs the middleware only for paths its matcher matches. Every matcher
    // entry must exclude `/googleb231020e03517669.html` so the static file is
    // served untouched.
    for (const pattern of config.matcher) {
      expect(new RegExp(`^${pattern}$`).test(`/${VERIFICATION_FILENAME}`)).toBe(false);
    }
  });

  it("still matches a normal app route (control)", () => {
    const matchesAny = config.matcher.some((pattern) =>
      new RegExp(`^${pattern}$`).test("/projects")
    );
    expect(matchesAny).toBe(true);
  });
});
