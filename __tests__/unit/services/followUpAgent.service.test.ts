import { fetchFollowUpCase, fetchFollowUpCases } from "@/services/followUpAgent.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

vi.mock("@/utilities/api/client", () => ({ api: { get: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const httpError = (status: number) =>
  Object.assign(Object.create(HttpError.prototype), { status, message: "x" });

describe("followUpAgent.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the paginated cases route", async () => {
    get.mockResolvedValue({ items: [], total: 0, page: 2, limit: 20 });

    const result = await fetchFollowUpCases("101105", 2, 20);

    expect(get).toHaveBeenCalledWith(
      "/v2/funding-programs/101105/follow-up-agent/cases?page=2&limit=20"
    );
    expect(result.forbidden).toBe(false);
  });

  it("marks the list forbidden on 403 instead of throwing", async () => {
    get.mockRejectedValue(httpError(403));

    await expect(fetchFollowUpCases("101105", 1, 20)).resolves.toEqual(
      expect.objectContaining({ forbidden: true, items: [] })
    );
  });

  it("rethrows other errors", async () => {
    get.mockRejectedValue(new Error("boom"));

    await expect(fetchFollowUpCases("101105", 1, 20)).rejects.toThrow("boom");
  });

  it("returns null for a missing case", async () => {
    get.mockRejectedValue(httpError(404));

    await expect(fetchFollowUpCase("101105", "0x1")).resolves.toBeNull();
  });
});
