vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
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
    spec: NOTEBOOK_SEED_SPEC,
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

    // This page renders whatever the spec names, so a config carrying a
    // section this build does not implement has to fail HERE. The indexer
    // rejects the same documents on write; this is the second door, for a
    // payload that reached the client some other way.
    it.each([
      ["an unknown section type", { version: 1, sections: [{ type: "iframe" }] }],
      ["an unknown kpi metric", { version: 1, sections: [{ type: "kpis", metrics: ["roi"] }] }],
      [
        "a source/metric pairing that names no series",
        {
          version: 1,
          sections: [
            { type: "bars", source: "tracks", metric: "disbursedVsCommitted", title: "T" },
          ],
        },
      ],
      [
        "an extra property smuggled onto a section",
        { version: 1, sections: [{ type: "applications", html: "<img src=x>" }] },
      ],
      ["a future schema version", { version: 2, sections: [{ type: "applications" }] }],
      ["no sections", { version: 1, sections: [] }],
      ["a spec that is not an object", "kpis"],
    ])("rejects a spec with %s", (_label, spec) => {
      const result = NotebookConfigSchema.safeParse(
        makeConfig({ spec } as unknown as Partial<NotebookConfig>)
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

    it.each(["communityId", "slug", "name", "spec", "status"] as const)("requires %s", (field) => {
      const config: Record<string, unknown> = { ...makeConfig() };
      delete config[field];

      expect(NotebookConfigSchema.safeParse(config).success).toBe(false);
    });
  });
});
