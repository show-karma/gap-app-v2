import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { getNewProjects } from "@/utilities/indexer/getNewProjects";
import "@testing-library/jest-dom";

vi.mock("@/utilities/api/client", () => ({
  api: {
    getPaginated: vi.fn(),
  },
}));
vi.mock("@/components/Utilities/errorManager");

const mockGetPaginated = api.getPaginated as vi.Mock;

describe("getNewProjects", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch projects successfully", async () => {
    const mockProjects = [
      { id: 1, name: "Project 1" },
      { id: 2, name: "Project 2" },
    ];
    const mockPageInfo = { totalItems: 2, page: 0, pageLimit: 10 };
    mockGetPaginated.mockResolvedValue({ data: mockProjects, pageInfo: mockPageInfo });

    const result = await getNewProjects(10, 0, "createdAt", "desc");

    expect(result).toEqual({
      projects: mockProjects,
      pageInfo: mockPageInfo,
      nextOffset: 1,
    });
    expect(mockGetPaginated).toHaveBeenCalledWith(expect.any(String));
  });

  it("should handle errors when fetching projects", async () => {
    mockGetPaginated.mockRejectedValue(new Error("Fetch error"));

    const result = await getNewProjects(10, 0, "createdAt", "desc");

    expect(result).toEqual({
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: 10 },
      nextOffset: 0,
    });
    expect(errorManager).toHaveBeenCalledWith(
      "Something went wrong while fetching new projects",
      expect.any(Error)
    );
  });

  it("should use default values for optional parameters", async () => {
    const mockProjects: unknown[] = [];
    const mockPageInfo = { totalItems: 0, page: 0, pageLimit: 10 };
    mockGetPaginated.mockResolvedValue({ data: mockProjects, pageInfo: mockPageInfo });

    await getNewProjects(10);

    expect(mockGetPaginated).toHaveBeenCalledWith(
      expect.stringContaining("createdAt") && expect.stringContaining("desc")
    );
  });

  it("should calculate correct nextOffset", async () => {
    const mockProjects = [{ id: 1, name: "Project 1" }];
    const mockPageInfo = { totalItems: 1, page: 2, pageLimit: 10 };
    mockGetPaginated.mockResolvedValue({ data: mockProjects, pageInfo: mockPageInfo });

    const result = await getNewProjects(10, 2, "updatedAt", "asc");

    expect(result.nextOffset).toBe(3);
  });
});
