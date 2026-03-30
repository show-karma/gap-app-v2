/**
 * @vitest-environment node
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createMockCommunity } from "@/__tests__/factories";
import { getCommunities } from "@/services/communities.service";

// Mock TokenManager to prevent Privy initialization
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue(null) },
}));

const BASE = "http://localhost:4000";

const community1 = createMockCommunity({
  details: { name: "Optimism Grants", slug: "optimism-grants" },
});
const community2 = createMockCommunity({
  details: { name: "Arbitrum DAO", slug: "arbitrum-dao" },
});

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("getCommunities (MSW-backed)", () => {
  describe("success", () => {
    it("fetches communities list and returns payload array", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/`, () =>
          HttpResponse.json({
            payload: [community1, community2],
            pagination: {
              totalCount: 2,
              page: 1,
              limit: 100,
              totalPages: 1,
            },
          })
        )
      );

      const result = await getCommunities();

      expect(result).toHaveLength(2);
      expect(result[0].details?.name).toBe("Optimism Grants");
      expect(result[1].details?.name).toBe("Arbitrum DAO");
    });

    it("passes pagination parameters to the API", async () => {
      let capturedUrl = "";

      server.use(
        http.get(`${BASE}/v2/communities/`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            payload: [],
            pagination: { totalCount: 0, page: 2, limit: 10, totalPages: 0 },
          });
        })
      );

      await getCommunities({ page: 2, limit: 10, includeStats: true });

      const url = new URL(capturedUrl);
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("includeStats")).toBe("true");
    });

    it("returns empty array when payload is empty", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/`, () =>
          HttpResponse.json({
            payload: [],
            pagination: { totalCount: 0, page: 1, limit: 100, totalPages: 0 },
          })
        )
      );

      const result = await getCommunities();
      expect(result).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("returns empty array on server error", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/`, () =>
          HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
      );

      const result = await getCommunities();
      expect(result).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      server.use(http.get(`${BASE}/v2/communities/`, () => HttpResponse.error()));

      const result = await getCommunities();
      expect(result).toEqual([]);
    });
  });

  describe("response transformation", () => {
    it("preserves community structure from API response", async () => {
      const communityWithFullDetails = createMockCommunity({
        uid: "0xcommunity123" as `0x${string}`,
        chainID: 10,
        details: {
          name: "Full Details Community",
          slug: "full-details",
          description: "A community with all fields populated",
          imageURL: "https://example.com/community.png",
        },
      });

      server.use(
        http.get(`${BASE}/v2/communities/`, () =>
          HttpResponse.json({
            payload: [communityWithFullDetails],
            pagination: { totalCount: 1, page: 1, limit: 100, totalPages: 1 },
          })
        )
      );

      const result = await getCommunities();

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("0xcommunity123");
      expect(result[0].chainID).toBe(10);
      expect(result[0].details?.slug).toBe("full-details");
      expect(result[0].details?.imageURL).toBe("https://example.com/community.png");
    });
  });
});
