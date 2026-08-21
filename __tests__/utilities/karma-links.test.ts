/**
 * The API docs live on the indexer, so the link to them must follow wherever
 * the indexer is configured to be.
 *
 * It was pinned to `https://gapapi.karmahq.xyz/v2/docs` and stayed there after
 * the API moved to api.karmahq.org, so the global footer — rendered on every
 * page — advertised a different host than /.well-known/api-catalog.
 */

const indexerUrl = vi.hoisted(() => ({ value: "https://api.karmahq.org" }));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    get NEXT_PUBLIC_GAP_INDEXER_URL() {
      return indexerUrl.value;
    },
    NEXT_PUBLIC_KARMA_API: "https://api.example.test/api",
  },
}));

const loadLinks = async (indexerBase: string) => {
  indexerUrl.value = indexerBase;
  vi.resetModules();
  const { karmaLinks } = await import("@/utilities/karma/karma");
  return karmaLinks;
};

describe("karmaLinks.apiDocs", () => {
  it("points at the configured indexer, not a pinned host", async () => {
    const links = await loadLinks("https://api.karmahq.org");

    expect(links.apiDocs).toBe("https://api.karmahq.org/v2/docs");
  });

  it("follows the indexer wherever it moves", async () => {
    const links = await loadLinks("https://gapstagapi.karmahq.xyz");

    expect(links.apiDocs).toBe("https://gapstagapi.karmahq.xyz/v2/docs");
  });

  it("does not double the slash when the base carries a trailing one", async () => {
    const links = await loadLinks("https://api.karmahq.org/");

    expect(links.apiDocs).toBe("https://api.karmahq.org/v2/docs");
    expect(links.apiDocs).not.toContain("//v2");
  });

  it("is an absolute URL, since it is rendered as an external href", async () => {
    const links = await loadLinks("https://api.karmahq.org");

    expect(links.apiDocs).toMatch(/^https?:\/\/[^/]+\/v2\/docs$/);
  });
});
