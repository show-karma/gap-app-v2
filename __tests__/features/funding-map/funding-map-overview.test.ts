import * as Sentry from "@sentry/nextjs";
import {
  EMPTY_OVERVIEW,
  FEATURED_PROGRAM_LIMIT,
  fetchFundingMapOverview,
} from "@/src/features/funding-map/server/funding-map-overview";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";

function createMockProgram(
  overrides: Partial<FundingProgramResponse> = {}
): FundingProgramResponse {
  return {
    _id: "656e57d7ec296b896ceacf28",
    programId: "961",
    isOnKarma: true,
    metadata: { title: "Optimism ASP" },
    communities: [
      {
        uid: "0xabc",
        name: "Optimism",
        slug: "optimism",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as FundingProgramResponse;
}

function stubFetchByUrl(
  handler: (url: string) => { ok: boolean; status?: number; body?: unknown }
) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const result = handler(String(url));
      return {
        ok: result.ok,
        status: result.status ?? 200,
        json: async () => result.body,
      };
    })
  );
}

const HAPPY_HANDLER = (url: string) => {
  if (url.includes("/filters")) {
    return {
      ok: true,
      body: {
        options: [
          { id: "1", name: "Celo", type: "community", programCount: 23 },
          { id: "2", name: "Optimism", type: "community", programCount: 20 },
          { id: "3", name: "Filecoin", type: "community", programCount: 12 },
          { id: "4", name: "Ethereum Foundation", type: "community", programCount: 9 },
          { id: "5", name: "Arbitrum", type: "community", programCount: 5 },
        ],
      },
    };
  }
  if (url.includes("status=active")) {
    return {
      ok: true,
      body: { count: 92, programs: [createMockProgram()] },
    };
  }
  return { ok: true, body: { count: 460, programs: [] } };
};

describe("fetchFundingMapOverview", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("success", () => {
    it("returns live counts, top organizations, and featured programs", async () => {
      stubFetchByUrl(HAPPY_HANDLER);

      const overview = await fetchFundingMapOverview();

      expect(overview.totalPrograms).toBe(460);
      expect(overview.activePrograms).toBe(92);
      expect(overview.organizationCount).toBe(5);
      expect(overview.topOrganizations).toEqual([
        "Celo",
        "Optimism",
        "Filecoin",
        "Ethereum Foundation",
      ]);
      expect(overview.featuredPrograms).toEqual([
        {
          programId: "961",
          name: "Optimism ASP",
          communitySlug: "optimism",
          communityName: "Optimism",
        },
      ]);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("skips programs without a linkable community page and caps the featured list", async () => {
      const programs = [
        createMockProgram({ isOnKarma: false }),
        createMockProgram({ communities: [] }),
        createMockProgram({ programId: undefined }),
        ...Array.from({ length: FEATURED_PROGRAM_LIMIT + 3 }, (_, i) =>
          createMockProgram({ programId: `p${i}` })
        ),
      ];
      stubFetchByUrl((url) =>
        url.includes("status=active")
          ? { ok: true, body: { count: 92, programs } }
          : HAPPY_HANDLER(url)
      );

      const overview = await fetchFundingMapOverview();

      expect(overview.featuredPrograms).toHaveLength(FEATURED_PROGRAM_LIMIT);
      expect(overview.featuredPrograms.every((program) => program.programId.startsWith("p"))).toBe(
        true
      );
    });
  });

  describe("error", () => {
    it("degrades each stat independently when one endpoint fails", async () => {
      stubFetchByUrl((url) =>
        url.includes("/filters") ? { ok: false, status: 502 } : HAPPY_HANDLER(url)
      );

      const overview = await fetchFundingMapOverview();

      expect(overview.totalPrograms).toBe(460);
      expect(overview.activePrograms).toBe(92);
      expect(overview.organizationCount).toBeNull();
      expect(overview.topOrganizations).toEqual([]);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("502") }),
        expect.objectContaining({ tags: { component: "funding-map/overview" } })
      );
    });

    it("returns the empty overview when every fetch rejects", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const overview = await fetchFundingMapOverview();

      expect(overview).toEqual(EMPTY_OVERVIEW);
      expect(Sentry.captureException).toHaveBeenCalledTimes(3);
    });
  });
});
