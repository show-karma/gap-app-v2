import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as errorManagerModule from "@/components/Utilities/errorManager";
import * as fetchDataModule from "@/utilities/fetchData";
import { getNewProjects } from "@/utilities/indexer/getNewProjects";
import "@testing-library/jest-dom";

// Use spyOn instead of jest.mock to avoid polluting global mock state
let mockFetchData: ReturnType<typeof spyOn>;
let mockErrorManager: ReturnType<typeof spyOn>;

describe("getNewProjects", () => {
  beforeEach(() => {
    mockFetchData = spyOn(fetchDataModule, "default").mockImplementation(() =>
      Promise.resolve([null, null, null])
    );
    mockErrorManager = spyOn(errorManagerModule, "errorManager").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore spies to prevent pollution of other test files
    mockFetchData?.mockRestore();
    mockErrorManager?.mockRestore();
  });

  it("should fetch projects successfully", async () => {
    const mockData = {
      data: [
        { id: 1, name: "Project 1" },
        { id: 2, name: "Project 2" },
      ],
    };
    const mockPageInfo = { totalItems: 2, page: 0, pageLimit: 10 };
    mockFetchData.mockResolvedValue([mockData, null, mockPageInfo]);

    const result = await getNewProjects(10, 0, "createdAt", "desc");

    expect(result).toEqual({
      projects: mockData.data,
      pageInfo: mockPageInfo,
      nextOffset: 1,
    });
    expect(mockFetchData).toHaveBeenCalledWith(expect.any(String));
  });

  it("should handle errors when fetching projects", async () => {
    mockFetchData.mockResolvedValue([null, new Error("Fetch error"), null]);

    const result = await getNewProjects(10, 0, "createdAt", "desc");

    expect(result).toEqual({
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: 10 },
      nextOffset: 0,
    });
    expect(mockErrorManager).toHaveBeenCalledWith(
      "Something went wrong while fetching new projects",
      expect.any(Error)
    );
  });

  it("should use default values for optional parameters", async () => {
    const mockData = { data: [] };
    const mockPageInfo = { totalItems: 0, page: 0, pageLimit: 10 };
    mockFetchData.mockResolvedValue([mockData, null, mockPageInfo]);

    await getNewProjects(10);

    expect(mockFetchData).toHaveBeenCalledWith(
      expect.stringContaining("createdAt") && expect.stringContaining("desc")
    );
  });

  it("should calculate correct nextOffset", async () => {
    const mockData = { data: [{ id: 1, name: "Project 1" }] };
    const mockPageInfo = { totalItems: 1, page: 2, pageLimit: 10 };
    mockFetchData.mockResolvedValue([mockData, null, mockPageInfo]);

    const result = await getNewProjects(10, 2, "updatedAt", "asc");

    expect(result.nextOffset).toBe(3);
  });
});
