/**
 * Coverage for the `isAuthorized` opt-out on project-profile services.
 *
 * Production callers no longer pass `isAuthorized: false` — TokenManager
 * works on both client and server, so authenticated visitors should always
 * send their bearer token. The option remains for explicit anonymous calls
 * (e.g. SDK consumers or future feature flags); these tests lock in that
 * the flag is correctly forwarded to `fetchData` when callers do opt out.
 */

import { getProjectGrants } from "../project-grants.service";
import { getProjectImpacts } from "../project-impacts.service";
import { getProjectUpdates } from "../project-updates.service";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      PROJECTS: {
        GRANTS: (slug: string) => `/v2/projects/${slug}/grants`,
        IMPACTS: (slug: string) => `/v2/projects/${slug}/impacts`,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchData.mockResolvedValue([[], null, null, 200]);
});

describe("public project profile fetch auth", () => {
  it("passes isAuthorized=false for grants when requested", async () => {
    await getProjectGrants("my-project", { isAuthorized: false });

    const [url, method, , , , isAuthorized] = mockFetchData.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/grants");
    expect(method).toBe("GET");
    expect(isAuthorized).toBe(false);
  });

  it("passes isAuthorized=false for impacts when requested", async () => {
    await getProjectImpacts("my-project", { isAuthorized: false });

    const [url, , , , , isAuthorized] = mockFetchData.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/impacts");
    expect(isAuthorized).toBe(false);
  });

  it("passes isAuthorized=false for updates when requested", async () => {
    mockFetchData.mockResolvedValueOnce([
      { projectUpdates: [], projectMilestones: [], grantMilestones: [], grantUpdates: [] },
      null,
      null,
      200,
    ]);
    await getProjectUpdates("my-project", undefined, { isAuthorized: false });

    const [url, , , , , isAuthorized] = mockFetchData.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/updates");
    expect(isAuthorized).toBe(false);
  });

  it("defaults to isAuthorized=true so authenticated callers keep working", async () => {
    await getProjectGrants("my-project");
    expect(mockFetchData.mock.calls[0][5]).toBe(true);
  });

  it("forwards AbortSignal to fetchData for grants when provided", async () => {
    const controller = new AbortController();
    await getProjectGrants("my-project", { isAuthorized: false, signal: controller.signal });
    expect(mockFetchData.mock.calls[0][8]).toBe(controller.signal);
  });

  it("forwards AbortSignal to fetchData for impacts when provided", async () => {
    const controller = new AbortController();
    await getProjectImpacts("my-project", { isAuthorized: false, signal: controller.signal });
    expect(mockFetchData.mock.calls[0][8]).toBe(controller.signal);
  });

  it("strips isAuthorized from the query string for updates", async () => {
    mockFetchData.mockResolvedValueOnce([
      { projectUpdates: [], projectMilestones: [], grantMilestones: [], grantUpdates: [] },
      null,
      null,
      200,
    ]);
    await getProjectUpdates("my-project", undefined, { isAuthorized: false });

    const url = mockFetchData.mock.calls[0][0] as string;
    expect(url).not.toContain("isAuthorized");
  });
});
