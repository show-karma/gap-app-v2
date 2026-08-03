/**
 * JavaScript-disabled rendering for the knowledge and collection templates
 * (DEV-586).
 *
 * Every route here ships in the static sitemap, so what `renderToString`
 * produces — no effects, no hydration, no client fetches — is exactly what a
 * crawler that does not execute JavaScript receives. The assertions are about
 * that HTML: a heading, enough visible prose to be worth indexing, the
 * structured data, and a canonical that points at the page itself.
 *
 * The project, funding-program and community-root templates already have their
 * own no-JS coverage (project-layout-ssr-shell, program-detail-ssr,
 * ssr-server-components) and are deliberately not duplicated here.
 */
import { PassThrough } from "node:stream";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Metadata } from "next";
import type React from "react";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/utilities/meta";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Auth-gated CTA: it depends on the Privy bridge, which has no server-side
// equivalent. It is a button, not indexable content.
vi.mock("@/src/features/homepage/components/create-project-button", () => ({
  CreateProjectButton: () => null,
}));

// The explorer list itself is client-fetched and sits behind Suspense; the
// no-JS assertions below are about the server-rendered shell around it.
vi.mock("@/components/Pages/Projects/ProjectsExplorer", () => ({
  ProjectsExplorer: () => null,
}));
// `/communities` has no server-rendered equivalent of the /projects hero: the
// whole listing is `CommunitiesPage`, a client component whose no-JS output is
// a text-free skeleton. Stubbing it changes nothing a crawler would have seen,
// and the assertions below are scoped accordingly — see the note on the
// `/communities` case for what is and is not proven here.
vi.mock("@/components/Pages/Communities/CommunitiesPage", () => ({
  CommunitiesPage: () => null,
}));
vi.mock("@/services/projects-explorer.service", () => ({
  getExplorerProjectsPaginated: vi.fn(async () => ({
    payload: [],
    pagination: { page: 0, pageLimit: 12, totalNum: 0 },
  })),
}));

const MIN_MEANINGFUL_CHARS = 200;

/** Visible text a reader sees with JavaScript disabled — the crawler's view. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const pattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match = pattern.exec(html);
  while (match !== null) {
    blocks.push(JSON.parse(match[1]) as Record<string, unknown>);
    match = pattern.exec(html);
  }
  return blocks;
}

function firstHeading(html: string): string | null {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? visibleText(match[1]) : null;
}

function canonicalOf(metadata: Metadata): string | undefined {
  const canonical = metadata.alternates?.canonical;
  return typeof canonical === "string" ? canonical : undefined;
}

/**
 * Streamed server render, for routes with a Suspense boundary. Resolves with
 * the complete shell + streamed chunks — what a crawler ends up with, since
 * Google consumes the whole response body before parsing.
 */
function renderStreamToString(ui: React.ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on("data", (chunk: Buffer) => chunks.push(chunk));
    sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    sink.on("error", reject);

    const { pipe } = renderToPipeableStream(ui, {
      onAllReady: () => pipe(sink),
      onError: reject,
    });
  });
}

async function renderRoute(
  importer: () => Promise<{
    default: (props?: never) => React.ReactNode | Promise<React.ReactNode>;
  }>
): Promise<string> {
  const { default: Page } = await importer();
  const ui = await Page();
  return renderToString(<>{ui}</>);
}

describe("knowledge article template — no-JS rendering", () => {
  const importArticle = () => import("@/app/knowledge/grant-accountability/page");

  it("server-renders a heading and substantive prose", async () => {
    const html = await renderRoute(importArticle);

    expect(firstHeading(html)).toMatch(/Grant Accountability/i);
    expect(visibleText(html).length).toBeGreaterThan(MIN_MEANINGFUL_CHARS);
  });

  it("emits Article structured data whose facts are visible in the HTML", async () => {
    const html = await renderRoute(importArticle);
    const article = jsonLdBlocks(html).find((block) => block["@type"] === "Article");

    expect(article).toBeDefined();
    expect(article?.url).toBe(`${SITE_URL}/knowledge/grant-accountability`);
    expect(visibleText(html)).toContain(String(article?.headline ?? ""));
  });

  it("self-canonicals at its own path", async () => {
    const { metadata } = await importArticle();

    expect(canonicalOf(metadata)).toBe("/knowledge/grant-accountability");
  });
});

describe("knowledge index template — no-JS rendering", () => {
  const importIndex = () => import("@/app/knowledge/page");

  it("server-renders the article links a crawler follows", async () => {
    const html = await renderRoute(importIndex);

    expect(firstHeading(html)).toMatch(/Knowledge Base/i);
    expect(html).toContain('href="/knowledge/grant-accountability"');
    expect(visibleText(html).length).toBeGreaterThan(MIN_MEANINGFUL_CHARS);
  });

  it("emits CollectionPage structured data pointing at itself", async () => {
    const html = await renderRoute(importIndex);
    const collection = jsonLdBlocks(html).find((block) => block["@type"] === "CollectionPage");

    expect(collection?.url).toBe(`${SITE_URL}/knowledge`);
  });

  it("self-canonicals at its own path", async () => {
    const { metadata } = await importIndex();

    expect(canonicalOf(metadata)).toBe("/knowledge");
  });
});

describe("collection templates — no-JS rendering", () => {
  it("/projects server-renders its hero and CollectionPage structured data", async () => {
    const { default: Page, metadata } = await import("@/app/projects/page");
    const ui = await Page({ searchParams: Promise.resolve({}) });
    // A fresh client per render, mirroring the per-request client the app
    // provider creates — the root layout supplies one in production.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const html = await renderStreamToString(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );

    expect(firstHeading(html)).toBeTruthy();
    expect(visibleText(html).length).toBeGreaterThan(MIN_MEANINGFUL_CHARS);

    const collection = jsonLdBlocks(html).find((block) => block["@type"] === "CollectionPage");
    expect(collection?.url).toBe(`${SITE_URL}/projects`);
    expect(canonicalOf(metadata)).toBe("/projects");
  });

  /**
   * Deliberately narrower than the /projects case above. `/communities` is
   * listed in the static sitemap but its listing is entirely client-rendered,
   * so there is no server prose to assert and this test does NOT claim the page
   * is meaningful without JavaScript — the sitemap crawl reports it as `thin`,
   * which is the honest signal and is not suppressed by any allowlist entry.
   *
   * What is asserted: the route still emits a server-rendered shell (an empty
   * body to a crawler fails here), its CollectionPage facts match the metadata
   * the page advertises, and it points its canonical at itself.
   */
  it("/communities server-renders a shell whose CollectionPage facts match its metadata", async () => {
    const { default: Page, metadata } = await import("@/app/communities/page");
    const html = renderToString(<>{await Page()}</>);

    expect(html).toMatch(/<main\b/);

    const collection = jsonLdBlocks(html).find((block) => block["@type"] === "CollectionPage");
    expect(collection?.url).toBe(`${SITE_URL}/communities`);
    expect(collection?.name).toBe(metadata.title);
    expect(collection?.description).toBe(metadata.description);
    expect(canonicalOf(metadata)).toBe("/communities");
  });

  it("keeps every collection canonical free of query strings", async () => {
    const modules = await Promise.all([
      import("@/app/projects/page"),
      import("@/app/communities/page"),
      import("@/app/knowledge/page"),
    ]);

    for (const mod of modules) {
      const canonical = canonicalOf(mod.metadata);
      expect(canonical).toBeTruthy();
      expect(canonical).not.toContain("?");
      expect(canonical?.startsWith("/")).toBe(true);
    }
  });
});
