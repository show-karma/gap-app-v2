import { api } from "@/utilities/api/client";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockApiGet = api.get as unknown as vi.Mock;

describe("fetchMyProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch projects when address is provided", async () => {
    const mockProjects = [{ uid: "project-1" }];
    mockApiGet.mockResolvedValue({ projects: mockProjects });

    const result = await fetchMyProjects("0x1234567890123456789012345678901234567890");

    expect(mockApiGet).toHaveBeenCalled();
    expect(result).toEqual(mockProjects);
  });

  it("should fetch projects for Farcaster users with no wallet address", async () => {
    // Farcaster users are authenticated via JWT but have no wallet address.
    // The API uses JWT auth (isAuthorized defaults to true on the api client),
    // NOT wallet address. The function should still make the API call.
    const mockProjects = [{ uid: "project-1" }];
    mockApiGet.mockResolvedValue({ projects: mockProjects });

    const result = await fetchMyProjects(undefined);

    expect(mockApiGet).toHaveBeenCalled();
    expect(result).toEqual(mockProjects);
  });
});
