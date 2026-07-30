/**
 * The V2 project-updates response has always carried the milestone `recipient`;
 * the frontend mapper dropped it, which is why the attestation flows re-fetched
 * the whole project through the SDK's V1 path (super-gap #63).
 */
import { fetchGrantMilestonesForProgram, fetchProjectGrantMilestones } from "@/services/milestones";

const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({ post: vi.fn(), get: vi.fn() }),
}));

const RECIPIENT = "0x1111111111111111111111111111111111111111";

const updatesPayload = (recipient?: string) => ({
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [
    {
      uid: "0xmilestone",
      programId: "1013",
      chainId: 42161,
      title: "Milestone",
      description: "desc",
      dueDate: "2025-01-01",
      status: "pending",
      recipient,
      completionDetails: null,
      verificationDetails: null,
      fundingApplicationCompletion: null,
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchGrantMilestonesForProgram", () => {
  it("issues a single V2 updates request and preserves the recipient", async () => {
    mockApiGet.mockResolvedValue(updatesPayload(RECIPIENT));

    const milestones = await fetchGrantMilestonesForProgram("0xproject", "1013_42161");

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    const [url] = mockApiGet.mock.calls[0];
    expect(url).toContain("/v2/projects/0xproject/updates");
    // The chain suffix is stripped before it reaches the API.
    expect(url).toContain("programIds=1013");
    expect(milestones[0].recipient).toBe(RECIPIENT);
  });

  it("leaves the recipient undefined for legacy rows", async () => {
    mockApiGet.mockResolvedValue(updatesPayload(undefined));

    const milestones = await fetchGrantMilestonesForProgram("0xproject", "1013");

    expect(milestones[0].recipient).toBeUndefined();
  });
});

describe("fetchProjectGrantMilestones", () => {
  it("maps the recipient through the full response too", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes("/updates")) return Promise.resolve(updatesPayload(RECIPIENT));
      if (url.includes("/grants")) return Promise.resolve([]);
      return Promise.resolve({ uid: "0xproject", chainID: 42161, owner: "0xowner" });
    });

    const response = await fetchProjectGrantMilestones("0xproject", "1013");

    expect(response.grantMilestones[0].recipient).toBe(RECIPIENT);
  });
});
