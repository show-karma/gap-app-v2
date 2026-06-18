import {
  getCommunityCategories,
  getCommunityCategoriesOrThrow,
} from "@/utilities/queries/v2/getCommunityData";

vi.mock("@/utilities/fetchData");
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as unknown as ReturnType<typeof vi.fn>;
const mockErrorManager = errorManager as unknown as ReturnType<typeof vi.fn>;

const COMMUNITY_ID = "test-community";

describe("getCommunityCategoriesOrThrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns merged categories on success", async () => {
    mockFetchData.mockResolvedValue([
      [
        {
          id: "cat-1",
          name: "DeFi",
          impact_segments: [{ id: "seg-1", name: "Segment", impact_indicators: [] }],
          outputs: [
            { id: "out-1", name: "Output", description: "desc", type: "output" },
            // Duplicate of an existing segment by id — must not be re-added.
            { id: "seg-1", name: "Segment", description: "dup", type: "output" },
          ],
        },
      ],
      null,
    ]);

    const result = await getCommunityCategoriesOrThrow(COMMUNITY_ID);

    expect(result).toHaveLength(1);
    // Original segment + the non-duplicate output merged in.
    expect(result[0].impact_segments).toHaveLength(2);
    expect(result[0].impact_segments?.map((s) => s.id)).toEqual(["seg-1", "out-1"]);
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("returns an empty array when the community has no categories (not an error)", async () => {
    mockFetchData.mockResolvedValue([[], null]);

    const result = await getCommunityCategoriesOrThrow(COMMUNITY_ID);

    expect(result).toEqual([]);
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("throws and reports through errorManager when the request returns an error tuple", async () => {
    mockFetchData.mockResolvedValue([null, "Server error"]);

    await expect(getCommunityCategoriesOrThrow(COMMUNITY_ID)).rejects.toThrow("Server error");
    expect(mockErrorManager).toHaveBeenCalledWith(
      `Error fetching categories for community ${COMMUNITY_ID}`,
      "Server error"
    );
  });

  it("propagates rejections from fetchData", async () => {
    mockFetchData.mockRejectedValue(new Error("network down"));

    await expect(getCommunityCategoriesOrThrow(COMMUNITY_ID)).rejects.toThrow("network down");
  });
});

describe("getCommunityCategories (SSR-safe wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] on an error tuple instead of throwing (pins SSR contract)", async () => {
    mockFetchData.mockResolvedValue([null, "Server error"]);

    await expect(getCommunityCategories(COMMUNITY_ID)).resolves.toEqual([]);
  });

  it("returns [] when fetchData rejects instead of throwing", async () => {
    mockFetchData.mockRejectedValue(new Error("network down"));

    await expect(getCommunityCategories(COMMUNITY_ID)).resolves.toEqual([]);
  });
});
