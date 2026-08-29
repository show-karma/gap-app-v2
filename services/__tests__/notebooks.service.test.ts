vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  getPublishedNotebook,
  getPublishedNotebooks,
  type NotebookConfig,
  NotebookConfigSchema,
} from "../notebooks.service";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

function makeConfig(overrides: Partial<NotebookConfig> = {}): NotebookConfig {
  return {
    id: "cfg-1",
    communityId: "0xfilecoin",
    slug: "grants-overview",
    name: "Grants & milestones overview",
    description: "Grants and milestones",
    artifactUrl: "https://app.karmahq.org/notebooks/filecoin/grants-overview/index.html",
    artifactVersion: "2026.08.28-1",
    status: "published",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  } as NotebookConfig;
}

describe("notebooks.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublishedNotebooks", () => {
    it("calls the community-scoped list endpoint", async () => {
      mockApiGet.mockResolvedValue([makeConfig()]);

      await getPublishedNotebooks("filecoin");

      expect(mockApiGet).toHaveBeenCalledWith(
        INDEXER.V2.NOTEBOOK_CONFIGS.LIST("filecoin"),
        expect.objectContaining({ isAuthorized: false })
      );
    });

    // These pages are public; sending an Authorization header would make the
    // response vary by viewer and defeat CDN caching.
    it("requests the list unauthenticated", async () => {
      mockApiGet.mockResolvedValue([]);

      await getPublishedNotebooks("filecoin");

      const [, options] = mockApiGet.mock.calls[0];
      expect(options.isAuthorized).toBe(false);
    });

    it("validates the response against the schema", async () => {
      mockApiGet.mockResolvedValue([]);

      await getPublishedNotebooks("filecoin");

      const [, options] = mockApiGet.mock.calls[0];
      expect(options.schema).toBeDefined();
    });

    it("returns the parsed configs", async () => {
      mockApiGet.mockResolvedValue([makeConfig(), makeConfig({ slug: "second" })]);

      const configs = await getPublishedNotebooks("filecoin");

      expect(configs.map((c) => c.slug)).toEqual(["grants-overview", "second"]);
    });

    // An empty list is a state the page renders, not a failure.
    it("returns an empty array when the community has no published pages", async () => {
      mockApiGet.mockResolvedValue([]);

      await expect(getPublishedNotebooks("filecoin")).resolves.toEqual([]);
    });

    it("returns an empty array when the client resolves nothing", async () => {
      mockApiGet.mockResolvedValue(undefined);

      await expect(getPublishedNotebooks("filecoin")).resolves.toEqual([]);
    });

    it("propagates a transport failure to the caller", async () => {
      mockApiGet.mockRejectedValue(new Error("network down"));

      await expect(getPublishedNotebooks("filecoin")).rejects.toThrow("network down");
    });
  });

  describe("getPublishedNotebook", () => {
    it("calls the slug-scoped endpoint", async () => {
      mockApiGet.mockResolvedValue(makeConfig());

      await getPublishedNotebook("filecoin", "grants-overview");

      expect(mockApiGet).toHaveBeenCalledWith(
        INDEXER.V2.NOTEBOOK_CONFIGS.GET("filecoin", "grants-overview"),
        expect.objectContaining({ isAuthorized: false })
      );
    });

    it("returns the parsed config", async () => {
      mockApiGet.mockResolvedValue(makeConfig());

      const config = await getPublishedNotebook("filecoin", "grants-overview");

      expect(config.slug).toBe("grants-overview");
      expect(config.status).toBe("published");
    });

    // A draft and an unknown slug are indistinguishable by design — the caller
    // must render one not-found state for both.
    it("propagates a not-found rejection without interpreting it", async () => {
      mockApiGet.mockRejectedValue(new Error("Request failed with status code 404"));

      await expect(getPublishedNotebook("filecoin", "secret-page")).rejects.toThrow("404");
    });
  });

  describe("NotebookConfigSchema", () => {
    it("accepts the documented wire shape", () => {
      expect(NotebookConfigSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it("accepts a null description", () => {
      expect(NotebookConfigSchema.safeParse(makeConfig({ description: null })).success).toBe(true);
    });

    // The value becomes an iframe src. A non-https or scheme-abusing URL must
    // fail at the boundary even if the API regressed.
    it.each([
      ["plain http", "http://example.com/notebook/"],
      ["a javascript url", "javascript:alert(1)"],
      ["a data url", "data:text/html,<script>alert(1)</script>"],
      ["a relative path", "/notebooks/filecoin/grants-overview/"],
      ["not a url", "grants-overview"],
    ])("rejects an artifactUrl that is %s", (_label, artifactUrl) => {
      const result = NotebookConfigSchema.safeParse(
        makeConfig({ artifactUrl } as Partial<NotebookConfig>)
      );

      expect(result.success).toBe(false);
    });

    it("rejects a status outside the closed set", () => {
      const result = NotebookConfigSchema.safeParse({
        ...makeConfig(),
        status: "archived",
      });

      expect(result.success).toBe(false);
    });

    // Forward compatibility: a field the API adds must not break an old client.
    it("tolerates unknown fields", () => {
      const result = NotebookConfigSchema.safeParse({
        ...makeConfig(),
        somethingNew: true,
      });

      expect(result.success).toBe(true);
    });

    it.each(["communityId", "slug", "name", "artifactUrl", "artifactVersion", "status"] as const)(
      "requires %s",
      (field) => {
        const config: Record<string, unknown> = { ...makeConfig() };
        delete config[field];

        expect(NotebookConfigSchema.safeParse(config).success).toBe(false);
      }
    );
  });
});
