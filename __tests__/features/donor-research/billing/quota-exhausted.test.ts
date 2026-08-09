/**
 * @file The 402 report-quota seam: the indexer's quota gate answers 402, and
 * the service must turn that into a distinct error type so the UI opens the
 * upgrade prompt instead of a generic failure line.
 */

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

import { createResearchReport } from "@/services/donor-research.service";
import {
  DonorReportQuotaExhaustedError,
  isReportQuotaExhausted,
  REPORT_QUOTA_EXHAUSTED_CODE,
} from "@/services/donor-research-billing.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = vi.mocked(fetchData);

const REPORT_BODY = {
  donorHandleId: "handle-1",
  criteriaText: "Youth literacy in Oakland",
  cause: null,
  geography: null,
  amountMin: null,
  amountMax: null,
  topCount: 5,
};

describe("createResearchReport quota handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws the quota-exhausted type on a 402", async () => {
    mockFetchData.mockResolvedValue([
      null,
      "No research reports remaining. Upgrade your plan to run more reports.",
      null,
      402,
    ]);

    await expect(createResearchReport(REPORT_BODY)).rejects.toBeInstanceOf(
      DonorReportQuotaExhaustedError
    );
  });

  it("keeps the server's message so the dialog can explain itself", async () => {
    mockFetchData.mockResolvedValue([null, "No research reports remaining.", null, 402]);

    await expect(createResearchReport(REPORT_BODY)).rejects.toThrow(
      "No research reports remaining."
    );
  });

  it("does not treat other failures as a quota refusal", async () => {
    // A 429 is the fair-use rate limit, a separate gate — it must still render
    // as an error, not an upgrade prompt.
    mockFetchData.mockResolvedValue([null, "Daily fast limit reached", null, 429]);

    const error = await createResearchReport(REPORT_BODY).catch((err) => err);
    expect(isReportQuotaExhausted(error)).toBe(false);
    expect(error).toBeInstanceOf(Error);
  });

  it("returns the report on success", async () => {
    mockFetchData.mockResolvedValue([
      { reportId: "report-1", status: "pending", streamUrl: "/stream" },
      null,
      null,
      202,
    ]);

    await expect(createResearchReport(REPORT_BODY)).resolves.toEqual(
      expect.objectContaining({ reportId: "report-1" })
    );
  });

  it("carries the shared error code the backend emits", () => {
    expect(new DonorReportQuotaExhaustedError().code).toBe(REPORT_QUOTA_EXHAUSTED_CODE);
    expect(REPORT_QUOTA_EXHAUSTED_CODE).toBe("donor_research_report_quota_exhausted");
  });

  it("narrows correctly for unrelated values", () => {
    expect(isReportQuotaExhausted(new Error("boom"))).toBe(false);
    expect(isReportQuotaExhausted(null)).toBe(false);
    expect(isReportQuotaExhausted("quota")).toBe(false);
  });
});
