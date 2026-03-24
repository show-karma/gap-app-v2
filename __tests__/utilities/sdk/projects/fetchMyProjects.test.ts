import fetchData from "@/utilities/fetchData";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockFetchData = fetchData as unknown as vi.Mock;

describe("fetchMyProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch projects when address is provided", async () => {
    const mockProjects = [{ uid: "project-1" }];
    mockFetchData.mockResolvedValue([{ projects: mockProjects }, null]);

    const result = await fetchMyProjects("0x1234567890123456789012345678901234567890");

    expect(mockFetchData).toHaveBeenCalled();
    expect(result).toEqual(mockProjects);
  });

  it("should fetch projects for Farcaster users with no wallet address", async () => {
    // Farcaster users are authenticated via JWT but have no wallet address.
    // The API uses JWT auth (fetchData with isAuthorized=true), NOT wallet address.
    // The function should still make the API call.
    const mockProjects = [{ uid: "project-1" }];
    mockFetchData.mockResolvedValue([{ projects: mockProjects }, null]);

    const result = await fetchMyProjects(undefined);

    expect(mockFetchData).toHaveBeenCalled();
    expect(result).toEqual(mockProjects);
  });
});
