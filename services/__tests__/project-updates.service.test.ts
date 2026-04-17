/**
 * Tests for project-updates.service
 *
 * Focuses on the URL construction (query string building) and the semantic rules
 * enforced before forwarding params to the indexer.
 */

import { getProjectUpdates } from "../project-updates.service";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      PROJECTS: {
        UPDATES: (slug: string) => `/v2/projects/${slug}/updates`,
      },
    },
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

const emptyResponse = {
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [],
  grantUpdates: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchData.mockResolvedValue([emptyResponse, null, null, 200]);
});

describe("getProjectUpdates — URL construction", () => {
  it("calls the base URL when no options are given", async () => {
    await getProjectUpdates("my-project");
    expect(mockFetchData).toHaveBeenCalledWith("/v2/projects/my-project/updates");
  });

  it("appends milestoneStatus to the query string", async () => {
    await getProjectUpdates("my-project", "completed");
    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/projects/my-project/updates?milestoneStatus=completed"
    );
  });

  it("appends dateFrom and dateTo to the query string", async () => {
    await getProjectUpdates("my-project", undefined, {
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("dateFrom")).toBe("2024-01-01");
    expect(params.get("dateTo")).toBe("2024-12-31");
  });

  it("swaps dateFrom and dateTo when dateFrom > dateTo (defensive)", async () => {
    await getProjectUpdates("my-project", undefined, {
      dateFrom: "2024-12-31",
      dateTo: "2024-01-01",
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("dateFrom")).toBe("2024-01-01");
    expect(params.get("dateTo")).toBe("2024-12-31");
  });

  it("appends hasAIEvaluation=true when set", async () => {
    await getProjectUpdates("my-project", undefined, { hasAIEvaluation: true });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("hasAIEvaluation")).toBe("true");
  });

  it("appends hasAIEvaluation=false when explicitly false and no aiScoreMin", async () => {
    await getProjectUpdates("my-project", undefined, { hasAIEvaluation: false });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("hasAIEvaluation")).toBe("false");
    expect(params.get("aiScoreMin")).toBeNull();
  });

  it("appends aiScoreMin and omits hasAIEvaluation=false to avoid backend 400", async () => {
    await getProjectUpdates("my-project", undefined, {
      hasAIEvaluation: false,
      aiScoreMin: 7,
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    // aiScoreMin must be present
    expect(params.get("aiScoreMin")).toBe("7");
    // hasAIEvaluation=false must NOT be sent alongside aiScoreMin
    expect(params.get("hasAIEvaluation")).toBeNull();
  });

  it("appends both hasAIEvaluation=true and aiScoreMin when both are set positively", async () => {
    await getProjectUpdates("my-project", undefined, {
      hasAIEvaluation: true,
      aiScoreMin: 5,
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("hasAIEvaluation")).toBe("true");
    expect(params.get("aiScoreMin")).toBe("5");
  });

  it("omits empty string dateFrom", async () => {
    await getProjectUpdates("my-project", undefined, { dateFrom: "" });
    const url = mockFetchData.mock.calls[0][0] as string;
    expect(url).toBe("/v2/projects/my-project/updates");
  });

  it("combines milestoneStatus with extra filters in one query string", async () => {
    await getProjectUpdates("my-project", "pending", {
      dateFrom: "2024-06-01",
      aiScoreMin: 3,
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("milestoneStatus")).toBe("pending");
    expect(params.get("dateFrom")).toBe("2024-06-01");
    expect(params.get("aiScoreMin")).toBe("3");
  });

  it("appends aiScoreMax when set", async () => {
    await getProjectUpdates("my-project", undefined, { aiScoreMax: 8 });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("aiScoreMax")).toBe("8");
  });

  it("appends both aiScoreMin and aiScoreMax when both set", async () => {
    await getProjectUpdates("my-project", undefined, { aiScoreMin: 3, aiScoreMax: 8 });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("aiScoreMin")).toBe("3");
    expect(params.get("aiScoreMax")).toBe("8");
  });

  it("swaps aiScoreMin and aiScoreMax when min > max (defensive)", async () => {
    await getProjectUpdates("my-project", undefined, { aiScoreMin: 8, aiScoreMax: 3 });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("aiScoreMin")).toBe("3");
    expect(params.get("aiScoreMax")).toBe("8");
  });

  it("omits hasAIEvaluation=false when aiScoreMax is set (no backend 400)", async () => {
    await getProjectUpdates("my-project", undefined, {
      hasAIEvaluation: false,
      aiScoreMax: 7,
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("aiScoreMax")).toBe("7");
    expect(params.get("hasAIEvaluation")).toBeNull();
  });

  it("appends hasAIEvaluation=true alongside aiScoreMax when both positively set", async () => {
    await getProjectUpdates("my-project", undefined, {
      hasAIEvaluation: true,
      aiScoreMax: 9,
    });
    const url = mockFetchData.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("hasAIEvaluation")).toBe("true");
    expect(params.get("aiScoreMax")).toBe("9");
  });

  it("returns empty response on 404 without calling errorManager", async () => {
    mockFetchData.mockResolvedValueOnce([null, "not found", null, 404]);
    const result = await getProjectUpdates("unknown-project");
    expect(result).toEqual(emptyResponse);
  });

  it("returns empty response on generic error", async () => {
    mockFetchData.mockResolvedValueOnce([null, "server error", null, 500]);
    const result = await getProjectUpdates("my-project");
    expect(result).toEqual(emptyResponse);
  });
});
