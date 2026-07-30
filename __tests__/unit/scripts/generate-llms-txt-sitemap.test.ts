import type {
  KnowledgeArticle,
  LandingPageContent,
  SitemapEntry,
} from "../../../scripts/generate-llms-txt";
import {
  assertRequiredSections,
  fetchSitemapEntries,
  generateLlmsFullTxt,
  generateLlmsTxt,
  parseSitemapIndexLocs,
  parseUrlSetEntries,
  REQUIRED_SECTIONS,
  SITEMAP_INDEX_CHILD_ALLOWLIST,
} from "../../../scripts/generate-llms-txt";

// Covers how the generator discovers site URLs and refuses to publish a
// document with an empty section. Kept out of generate-llms-txt.test.ts, which
// covers the text-extraction and formatting helpers and is already oversized.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLandingPage(overrides: Partial<LandingPageContent> = {}): LandingPageContent {
  return {
    path: "/",
    label: "Home",
    url: "https://karmahq.xyz/",
    title: "Karma - Where builders get funded",
    description: "Ecosystems use Karma to fund projects transparently.",
    snippet: "Ecosystems use Karma to fund projects.",
    fullText: "Ecosystems use Karma to fund projects transparently. Builders share progress.",
    source: "firecrawl",
    lastUpdated: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeArticle(overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle {
  return {
    slug: "grant-accountability",
    title: "What Is Grant Accountability in Web3?",
    description: "Grant accountability turns funding promises into persistent execution history.",
    url: "https://karmahq.xyz/knowledge/grant-accountability",
    category: "Core Concepts",
    body: "Grant accountability is the practice of tracking funded work.",
    sourcePath: "app/knowledge/grant-accountability/page.tsx",
    lastUpdated: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSitemapEntry(overrides: Partial<SitemapEntry> = {}): SitemapEntry {
  return {
    url: "https://karmahq.xyz",
    lastModified: "2024-01-01",
    changeFrequency: "weekly",
    priority: "1.0",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sitemap parsing — /sitemap.xml is an INDEX, its children are the urlsets
// ---------------------------------------------------------------------------

const SITEMAP_INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.karmahq.xyz/sitemaps/static/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.karmahq.xyz/sitemaps/communities/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.karmahq.xyz/sitemaps/projects/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
`;

const STATIC_URLSET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://www.karmahq.xyz</loc>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://www.karmahq.xyz/about</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>https://www.karmahq.xyz/blog/hello-world</loc>
<lastmod>2026-01-02T00:00:00.000Z</lastmod>
<changefreq>weekly</changefreq>
<priority>0.6</priority>
</url>
</urlset>
`;

const EMPTY_URLSET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

function xmlResponse(xml: string) {
  return { ok: true, status: 200, text: async () => xml };
}

describe("parseSitemapIndexLocs", () => {
  it("extracts child <loc> values from a sitemap index", () => {
    expect(parseSitemapIndexLocs(SITEMAP_INDEX_XML)).toEqual([
      "https://www.karmahq.xyz/sitemaps/static/sitemap.xml",
      "https://www.karmahq.xyz/sitemaps/communities/sitemap.xml",
      "https://www.karmahq.xyz/sitemaps/projects/sitemap.xml",
    ]);
  });

  it("decodes HTML entities in child locs", () => {
    const xml =
      "<sitemapindex><sitemap><loc>https://www.karmahq.xyz/s?a=1&amp;b=2</loc></sitemap></sitemapindex>";
    expect(parseSitemapIndexLocs(xml)).toEqual(["https://www.karmahq.xyz/s?a=1&b=2"]);
  });

  it("returns an empty list for a plain urlset document", () => {
    expect(parseSitemapIndexLocs(STATIC_URLSET_XML)).toEqual([]);
  });
});

describe("parseUrlSetEntries", () => {
  it("parses <url> blocks into sitemap entries", () => {
    const entries = parseUrlSetEntries(STATIC_URLSET_XML);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      url: "https://www.karmahq.xyz",
      lastModified: "",
      changeFrequency: "daily",
      priority: "1",
    });
    expect(entries[2]).toEqual({
      url: "https://www.karmahq.xyz/blog/hello-world",
      lastModified: "2026-01-02T00:00:00.000Z",
      changeFrequency: "weekly",
      priority: "0.6",
    });
  });

  it("skips blocks without a loc", () => {
    const xml = "<urlset><url><priority>0.5</priority></url></urlset>";
    expect(parseUrlSetEntries(xml)).toEqual([]);
  });

  it("returns an empty list for a sitemap index document", () => {
    expect(parseUrlSetEntries(SITEMAP_INDEX_XML)).toEqual([]);
  });
});

describe("fetchSitemapEntries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allowlists the static child sitemap", () => {
    expect(SITEMAP_INDEX_CHILD_ALLOWLIST).toEqual(["/sitemaps/static/sitemap.xml"]);
  });

  it("recurses into the allowlisted index children only", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/sitemaps/static/")
        ? xmlResponse(STATIC_URLSET_XML)
        : xmlResponse(SITEMAP_INDEX_XML)
    );
    vi.stubGlobal("fetch", fetchMock);

    const entries = await fetchSitemapEntries();

    const requested = fetchMock.mock.calls.map((call) => call[0]);
    expect(requested).toEqual([
      "https://www.karmahq.xyz/sitemap.xml",
      "https://www.karmahq.xyz/sitemaps/static/sitemap.xml",
    ]);
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://www.karmahq.xyz",
      "https://www.karmahq.xyz/about",
      "https://www.karmahq.xyz/blog/hello-world",
    ]);
  });

  it("parses a direct urlset response without a second fetch", async () => {
    const fetchMock = vi.fn(async () => xmlResponse(STATIC_URLSET_XML));
    vi.stubGlobal("fetch", fetchMock);

    const entries = await fetchSitemapEntries();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(3);
  });

  it("rejects when the allowlisted children yield no URLs — no silent fallback", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/sitemaps/static/")
        ? xmlResponse(EMPTY_URLSET_XML)
        : xmlResponse(SITEMAP_INDEX_XML)
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSitemapEntries()).rejects.toThrow(/no <url> entries/);
  });

  it("rejects when the index lists no allowlisted child", async () => {
    const indexWithoutStatic = SITEMAP_INDEX_XML.replace(
      "<loc>https://www.karmahq.xyz/sitemaps/static/sitemap.xml</loc>",
      "<loc>https://www.karmahq.xyz/sitemaps/grants/sitemap.xml</loc>"
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => xmlResponse(indexWithoutStatic))
    );

    await expect(fetchSitemapEntries()).rejects.toThrow(/no children matching/);
  });

  it("rejects on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, text: async () => "" }))
    );

    await expect(fetchSitemapEntries()).rejects.toThrow(/\(503\)/);
  });
});

// ---------------------------------------------------------------------------
// assertRequiredSections — the generated documents cannot ship an empty section
// ---------------------------------------------------------------------------

describe("assertRequiredSections", () => {
  const articles = [makeArticle()];
  const landingPages = [
    makeLandingPage({ path: "/", label: "Home" }),
    makeLandingPage({
      path: "/funders",
      label: "For Funders",
      url: "https://karmahq.xyz/funders",
    }),
  ];

  it("throws when the Site URL Index renders empty", () => {
    // The exact silent-regression input: every sitemap entry is also a landing
    // page, so the URL index section filters down to nothing.
    const output = generateLlmsTxt(
      articles,
      landingPages,
      [
        makeSitemapEntry({ url: "https://karmahq.xyz" }),
        makeSitemapEntry({ url: "https://karmahq.xyz/funders" }),
      ],
      []
    );

    expect(output).toContain("## Site URL Index");
    expect(() => assertRequiredSections("llms.txt", output)).toThrow(/Site URL Index/);
  });

  it("passes when the Site URL Index has at least one entry", () => {
    const output = generateLlmsTxt(
      articles,
      landingPages,
      [
        makeSitemapEntry({ url: "https://karmahq.xyz" }),
        makeSitemapEntry({ url: "https://www.karmahq.xyz/about", priority: "0.8" }),
      ],
      []
    );

    expect(() => assertRequiredSections("llms.txt", output)).not.toThrow();
  });

  it("validates llms-full.txt output too", () => {
    const emptyIndex = generateLlmsFullTxt(
      articles,
      landingPages,
      [makeSitemapEntry({ url: "https://karmahq.xyz" })],
      []
    );
    expect(() => assertRequiredSections("llms-full.txt", emptyIndex)).toThrow(/Site URL Index/);

    const populatedIndex = generateLlmsFullTxt(
      articles,
      landingPages,
      [makeSitemapEntry({ url: "https://www.karmahq.xyz/about", priority: "0.8" })],
      []
    );
    expect(() => assertRequiredSections("llms-full.txt", populatedIndex)).not.toThrow();
  });

  it("throws when a required section has no link bullets", () => {
    const output = [
      "# Karma",
      "",
      "## Landing Pages",
      "",
      "## Site URL Index",
      "- [Home](https://www.karmahq.xyz)",
      "",
      "## Optional",
      "- [Complete LLM Reference](https://www.karmahq.xyz/llms-full.txt)",
    ].join("\n");

    expect(() => assertRequiredSections("llms.txt", output)).toThrow(/Landing Pages/);
  });

  it("throws when a required section is missing entirely", () => {
    expect(() => assertRequiredSections("llms.txt", "# Karma\n")).toThrow(
      /required section "## Landing Pages" is missing/
    );
  });

  it("throws for an unknown document name", () => {
    expect(() => assertRequiredSections("unknown.txt", "# Karma\n")).toThrow(
      /No required-section rules/
    );
  });

  it("requires the Site URL Index in both documents", () => {
    expect(REQUIRED_SECTIONS["llms.txt"]).toContain("## Site URL Index");
    expect(REQUIRED_SECTIONS["llms-full.txt"]).toContain("## Site URL Index");
  });
});
