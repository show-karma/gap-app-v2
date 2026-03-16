import fetchData from "@/utilities/fetchData";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

const mockFetchData = fetchData as unknown as jest.Mock;

describe("fetchMyProjects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
