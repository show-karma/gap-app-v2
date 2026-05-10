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

const mockFetchData = vi.mocked(fetchData);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchData.mockResolvedValue([[], null, null, 200] as never);
});

describe("public project profile fetch auth", () => {
  it("passes isAuthorized=false for grants when requested", async () => {
    await getProjectGrants("my-project", { isAuthorized: false });

    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/projects/my-project/grants",
      "GET",
      {},
      {},
      {},
      false
    );
  });

  it("passes isAuthorized=false for impacts when requested", async () => {
    await getProjectImpacts("my-project", { isAuthorized: false });

    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/projects/my-project/impacts",
      "GET",
      {},
      {},
      {},
      false
    );
  });

  it("passes isAuthorized=false for updates when requested", async () => {
    await getProjectUpdates("my-project", undefined, { isAuthorized: false });

    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/projects/my-project/updates",
      "GET",
      {},
      {},
      {},
      false
    );
  });
});
