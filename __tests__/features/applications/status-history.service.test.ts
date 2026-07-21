/**
 * DEV-517: the service re-requests the application with the caller's token so
 * the backend can return the private status-change reasons to authorized
 * viewers. The service itself makes no access decision.
 */

import { getApplicationStatusHistory } from "@/src/features/applications/services/status-history.service";
import fetchData from "@/utilities/fetchData";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockFetchData = fetchData as unknown as vi.Mock;

const statusHistory = [
  { status: "rejected", timestamp: "2026-02-25T00:00:00.000Z", reason: "why" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getApplicationStatusHistory", () => {
  it("should return the application's status history from the authenticated endpoint", async () => {
    mockFetchData.mockResolvedValue([{ statusHistory }, null, null, 200]);

    const result = await getApplicationStatusHistory("REF-123");

    expect(result).toEqual(statusHistory);
    expect(mockFetchData).toHaveBeenCalledWith("/v2/funding-applications/REF-123", "GET");
  });

  it("should return an empty array when the application has no status history", async () => {
    mockFetchData.mockResolvedValue([{ referenceNumber: "REF-123" }, null, null, 200]);

    expect(await getApplicationStatusHistory("REF-123")).toEqual([]);
  });

  it("should throw on fetch failure so the SSR fallback is preserved", async () => {
    mockFetchData.mockResolvedValue([null, "Request failed", null, 500]);

    await expect(getApplicationStatusHistory("REF-123")).rejects.toThrow("Request failed");
  });
});
