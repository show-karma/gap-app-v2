/**
 * @vitest-environment node
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createMockGrant } from "@/__tests__/factories";
import { getProjectGrants } from "@/services/project-grants.service";

// Mock TokenManager to prevent Privy initialization
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue(null) },
}));

const BASE = "http://localhost:4000";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const grant1 = createMockGrant({
  uid: "0xgrant001" as `0x${string}`,
  details: { title: "Infrastructure Scaling Grant" },
});

const grant2 = createMockGrant({
  uid: "0xgrant002" as `0x${string}`,
  details: { title: "Research Grant" },
});

describe("getProjectGrants (MSW-backed)", () => {
  describe("success", () => {
    it("fetches and returns grants array", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () =>
          HttpResponse.json([grant1, grant2])
        )
      );

      const result = await getProjectGrants("test-project");

      expect(result).toHaveLength(2);
      expect(result[0].details?.title).toBe("Infrastructure Scaling Grant");
      expect(result[1].details?.title).toBe("Research Grant");
    });

    it("handles single grant object (non-array response)", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () => HttpResponse.json(grant1))
      );

      const result = await getProjectGrants("test-project");

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("0xgrant001");
    });

    it("returns empty array when project has no grants", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () => HttpResponse.json([]))
      );

      const result = await getProjectGrants("test-project");
      expect(result).toEqual([]);
    });

    it("uses the correct project identifier in the URL", async () => {
      let capturedId = "";

      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, ({ params }) => {
          capturedId = params.projectIdOrSlug as string;
          return HttpResponse.json([]);
        })
      );

      await getProjectGrants("my-project-slug");
      expect(capturedId).toBe("my-project-slug");
    });
  });

  describe("error handling", () => {
    it("returns empty array on 404 (project not found)", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () =>
          HttpResponse.json({ message: "Project not found" }, { status: 404 })
        )
      );

      const result = await getProjectGrants("nonexistent");
      expect(result).toEqual([]);
    });

    it("returns empty array on 500 server error", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () =>
          HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
      );

      const result = await getProjectGrants("test-project");
      expect(result).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () => HttpResponse.error())
      );

      const result = await getProjectGrants("test-project");
      expect(result).toEqual([]);
    });
  });

  describe("grant data structure", () => {
    it("preserves full grant details including milestones and community", async () => {
      const grantWithDetails = createMockGrant({
        uid: "0xdetailed" as `0x${string}`,
        chainID: 42161,
        details: {
          title: "Detailed Grant",
          amount: "100000",
          currency: "USDC",
          description: "A grant with all fields",
        },
        community: {
          uid: "0xcommunity" as `0x${string}`,
          chainID: 42161,
          details: {
            name: "Arbitrum DAO",
            slug: "arbitrum-dao",
          },
        },
      });

      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () =>
          HttpResponse.json([grantWithDetails])
        )
      );

      const result = await getProjectGrants("test-project");

      expect(result).toHaveLength(1);
      expect(result[0].chainID).toBe(42161);
      expect(result[0].details?.amount).toBe("100000");
      expect(result[0].community?.details?.name).toBe("Arbitrum DAO");
    });
  });
});
