/**
 * Coverage for the `isAuthorized` opt-out on project-profile services.
 *
 * Production callers no longer pass `isAuthorized: false` — TokenManager
 * works on both client and server, so authenticated visitors should always
 * send their bearer token. The option remains for explicit anonymous calls
 * (e.g. SDK consumers or future feature flags); these tests lock in that
 * the flag is correctly forwarded when callers do opt out.
 *
 * `getProjectGrants`, `getProjectImpacts`, and `getProjectUpdates` were all
 * migrated (#1775 Phase 3) off the legacy `fetchData` tuple onto the typed
 * `api` client, so every call in this file now goes through the mocked
 * `@/utilities/api/client`.
 */

import { getProjectGrants } from "../project-grants.service";
import { getProjectImpacts } from "../project-impacts.service";
import { getProjectUpdates } from "../project-updates.service";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
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

import { api } from "@/utilities/api/client";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;

beforeEach(() => {
  vi.clearAllMocks();
  mockApiGet.mockResolvedValue([]);
});

describe("public project profile fetch auth", () => {
  it("passes isAuthorized=false for grants when requested", async () => {
    await getProjectGrants("my-project", { isAuthorized: false });

    const [url, opts] = mockApiGet.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/grants");
    expect(opts?.isAuthorized).toBe(false);
  });

  it("passes isAuthorized=false for impacts when requested", async () => {
    await getProjectImpacts("my-project", { isAuthorized: false });

    const [url, opts] = mockApiGet.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/impacts");
    expect(opts?.isAuthorized).toBe(false);
  });

  it("passes isAuthorized=false for updates when requested", async () => {
    await getProjectUpdates("my-project", undefined, { isAuthorized: false });

    const [url, opts] = mockApiGet.mock.calls[0];
    expect(url).toBe("/v2/projects/my-project/updates");
    expect(opts?.isAuthorized).toBe(false);
  });

  it("defaults to isAuthorized=true so authenticated callers keep working", async () => {
    await getProjectGrants("my-project");
    expect(mockApiGet.mock.calls[0][1]?.isAuthorized).toBe(true);
  });

  it("forwards AbortSignal to the api client for grants when provided", async () => {
    const controller = new AbortController();
    await getProjectGrants("my-project", { isAuthorized: false, signal: controller.signal });
    expect(mockApiGet.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("forwards AbortSignal to the api client for impacts when provided", async () => {
    const controller = new AbortController();
    await getProjectImpacts("my-project", { isAuthorized: false, signal: controller.signal });
    expect(mockApiGet.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("strips isAuthorized from the query string for updates", async () => {
    await getProjectUpdates("my-project", undefined, { isAuthorized: false });

    const url = mockApiGet.mock.calls[0][0] as string;
    expect(url).not.toContain("isAuthorized");
  });
});
