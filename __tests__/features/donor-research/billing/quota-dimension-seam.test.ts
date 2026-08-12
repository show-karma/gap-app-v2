/**
 * Cross-service seam: every metered donor-research action must map its backend
 * 402 to the dimension-specific error the UI keys off, and the pack checkout
 * must hit the pack endpoint. A drift here means an exhausted intro/diligence/
 * profile opens the wrong dialog (or a generic red error) even though CI is
 * green on both services — exactly the class the pricing plan's §3 guards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/fetchData", () => ({ __esModule: true, default: vi.fn() }));

import { askQuestions, requestIntro } from "@/services/diligence.service";
import { createDonorHandle, createResearchReport } from "@/services/donor-research.service";
import {
  DonorDiligenceQuotaExhaustedError,
  DonorIntroQuotaExhaustedError,
  DonorProfileQuotaExhaustedError,
  DonorReportQuotaExhaustedError,
  isDiligenceQuotaExhausted,
  isIntroQuotaExhausted,
  isProfileQuotaExhausted,
  startPackCheckout,
} from "@/services/donor-research-billing.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = vi.mocked(fetchData);

/** fetchData returns the tuple [data, error, pageInfo, status]. */
function reply(data: unknown, error: string | null, status: number) {
  mockFetchData.mockResolvedValue([data, error, null, status] as never);
}

describe("donor-research quota dimension seam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts a pack purchase to the pack-checkout endpoint", async () => {
    reply({ url: "https://pack", sessionId: "cs_pack" }, null, 201);

    const session = await startPackCheckout({
      pack: "reports_10",
      successUrl: "https://x/ok",
      cancelUrl: "https://x/no",
    });

    expect(session.url).toBe("https://pack");
    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/donor-research/billing/packs/checkout",
      "POST",
      expect.objectContaining({ pack: "reports_10" })
    );
  });

  it("maps a report 402 to the report-quota error", async () => {
    reply(null, "no reports", 402);
    await expect(
      createResearchReport({ donorHandleId: "h1", criteriaText: "x" } as never)
    ).rejects.toBeInstanceOf(DonorReportQuotaExhaustedError);
  });

  it("maps a profile 402 to the profile-quota error", async () => {
    reply(null, "cap reached", 402);
    const error = await createDonorHandle({ opaqueLabel: "Client A" }).catch((e) => e);
    expect(error).toBeInstanceOf(DonorProfileQuotaExhaustedError);
    expect(isProfileQuotaExhausted(error)).toBe(true);
  });

  it("maps a diligence 402 to the diligence-quota error", async () => {
    reply(null, "no diligence", 402);
    const error = await askQuestions("r1", "c1").catch((e) => e);
    expect(error).toBeInstanceOf(DonorDiligenceQuotaExhaustedError);
    expect(isDiligenceQuotaExhausted(error)).toBe(true);
  });

  it("maps an intro 402 to the intro-quota error, distinct from the 422 email path", async () => {
    reply(null, "no intros", 402);
    const error = await requestIntro("r1", "c1").catch((e) => e);
    expect(error).toBeInstanceOf(DonorIntroQuotaExhaustedError);
    expect(isIntroQuotaExhausted(error)).toBe(true);
  });

  it("keeps the 422 email-required intro path as a recoverable result, not a throw", async () => {
    reply(null, "email required", 422);
    const result = await requestIntro("r1", "c1");
    expect(result.kind).toBe("email_required");
  });
});
