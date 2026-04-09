/**
 * @vitest-environment node
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { getProjectUpdates } from "@/services/project-updates.service";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";

// Mock TokenManager to prevent Privy initialization
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue(null) },
}));

const BASE = "http://localhost:4000";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const fullApiResponse: UpdatesApiResponse = {
  projectUpdates: [
    {
      uid: "update-1",
      recipient: "0xabc123",
      title: "Q1 Progress Update",
      description: "Completed initial milestones for the quarter",
      verified: false,
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-03-31T00:00:00Z",
      createdAt: "2024-04-01T10:00:00Z",
      associations: {
        deliverables: [],
        indicators: [],
        funding: [],
      },
    },
  ],
  projectMilestones: [
    {
      uid: "milestone-1",
      title: "API v2 Launch",
      description: "Deploy the v2 API to production",
      status: "completed",
      dueDate: "2024-06-30T00:00:00Z",
      createdAt: "2024-03-01T00:00:00Z",
      recipient: "0xdef456",
      completionDetails: {
        description: "Deployed to mainnet",
        completedAt: "2024-06-15T00:00:00Z",
        completedBy: "0xdef456",
      },
    },
  ],
  grantMilestones: [
    {
      uid: "grant-ms-1",
      programId: "program-1",
      chainId: "10",
      title: "Infrastructure Setup",
      description: "Set up indexing infrastructure",
      dueDate: "2024-12-31T00:00:00Z",
      createdAt: "2024-01-15T00:00:00Z",
      recipient: "0x789",
      status: "pending",
      grant: {
        uid: "grant-1",
        title: "Infra Grant",
        communityName: "Optimism",
      },
      completionDetails: null,
      verificationDetails: null,
      fundingApplicationCompletion: null,
    },
  ],
  grantUpdates: [],
};

describe("getProjectUpdates (MSW-backed)", () => {
  describe("success", () => {
    it("fetches and returns the full updates response", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () =>
          HttpResponse.json(fullApiResponse)
        )
      );

      const result = await getProjectUpdates("test-project");

      expect(result.projectUpdates).toHaveLength(1);
      expect(result.projectUpdates[0].title).toBe("Q1 Progress Update");
      expect(result.projectUpdates[0].recipient).toBe("0xabc123");

      expect(result.projectMilestones).toHaveLength(1);
      expect(result.projectMilestones[0].status).toBe("completed");
      expect(result.projectMilestones[0].completionDetails?.completedBy).toBe("0xdef456");

      expect(result.grantMilestones).toHaveLength(1);
      expect(result.grantMilestones[0].grant?.title).toBe("Infra Grant");

      expect(result.grantUpdates).toEqual([]);
    });

    it("uses the project slug in the request URL", async () => {
      let capturedSlug = "";

      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, ({ params }) => {
          capturedSlug = params.projectIdOrSlug as string;
          return HttpResponse.json({
            projectUpdates: [],
            projectMilestones: [],
            grantMilestones: [],
            grantUpdates: [],
          });
        })
      );

      await getProjectUpdates("my-cool-project");

      expect(capturedSlug).toBe("my-cool-project");
    });
  });

  describe("error handling", () => {
    it("returns empty response on 404 (missing project)", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () =>
          HttpResponse.json({ message: "Project not found" }, { status: 404 })
        )
      );

      const result = await getProjectUpdates("nonexistent-project");

      expect(result.projectUpdates).toEqual([]);
      expect(result.projectMilestones).toEqual([]);
      expect(result.grantMilestones).toEqual([]);
      expect(result.grantUpdates).toEqual([]);
    });

    it("returns empty response on 500 server error", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () =>
          HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
      );

      const result = await getProjectUpdates("test-project");

      expect(result.projectUpdates).toEqual([]);
      expect(result.projectMilestones).toEqual([]);
      expect(result.grantMilestones).toEqual([]);
      expect(result.grantUpdates).toEqual([]);
    });

    it("returns empty response on network error", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () => HttpResponse.error())
      );

      const result = await getProjectUpdates("test-project");

      expect(result.projectUpdates).toEqual([]);
      expect(result.projectMilestones).toEqual([]);
      expect(result.grantMilestones).toEqual([]);
      expect(result.grantUpdates).toEqual([]);
    });
  });

  describe("response structure", () => {
    it("preserves all nested objects from API", async () => {
      server.use(
        http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () =>
          HttpResponse.json(fullApiResponse)
        )
      );

      const result = await getProjectUpdates("test-project");

      // Verify associations are preserved
      const update = result.projectUpdates[0];
      expect(update.associations).toBeDefined();
      expect(update.associations.deliverables).toEqual([]);
      expect(update.associations.indicators).toEqual([]);

      // Verify completion details are preserved
      const milestone = result.projectMilestones[0];
      expect(milestone.completionDetails).toBeDefined();
      expect(milestone.completionDetails?.description).toBe("Deployed to mainnet");
    });
  });
});
