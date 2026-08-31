/**
 * Cross-service seam: every metered donor-research action must map its backend
 * 402 to the dimension-specific error the UI keys off, and the pack checkout
 * must hit the pack endpoint. A drift here means an exhausted intro/diligence/
 * profile opens the wrong dialog (or a generic red error) even though CI is
 * green on both services — exactly the class the pricing plan's §3 guards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

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
import { HttpError } from "@/utilities/api/errors";

/**
 * The exact 402 the consumable quota gate sends
 * (gap-indexer `donor-research-report-quota.middleware.ts`).
 */
function quota402(dimension: "reports" | "intros" | "diligence", message = "out of quota") {
  return new HttpError(402, {
    endpoint: "/v2/donor-research/x",
    method: "POST",
    body: {
      error: `donor_research_${dimension}_quota_exhausted`,
      message,
      dimension,
      plan: "starter",
      status: "active",
      remaining: 0,
    },
  });
}

/** The profile cap's 402, which additionally carries the cap and the usage. */
function profileCap402() {
  return new HttpError(402, {
    endpoint: "/v2/donor-research/handles",
    method: "POST",
    body: {
      error: "donor_research_profile_quota_exhausted",
      message: "Donor-profile limit reached. Upgrade your plan to manage more donor profiles.",
      dimension: "profiles",
      plan: "starter",
      status: "active",
      profilesIncluded: 3,
      profilesUsed: 3,
      remaining: 0,
    },
  });
}

describe("donor-research quota dimension seam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts a pack purchase to the pack-checkout endpoint", async () => {
    mockApiPost.mockResolvedValue({ url: "https://pack", sessionId: "cs_pack" });

    const session = await startPackCheckout({
      pack: "reports_10",
      successUrl: "https://x/ok",
      cancelUrl: "https://x/no",
    });

    expect(session.url).toBe("https://pack");
    expect(mockApiPost).toHaveBeenCalledWith(
      "/v2/donor-research/billing/packs/checkout",
      expect.objectContaining({ pack: "reports_10" })
    );
  });

  it("maps a report 402 to the report-quota error", async () => {
    mockApiPost.mockRejectedValue(quota402("reports", "no reports"));
    await expect(
      createResearchReport({ donorHandleId: "h1", criteriaText: "x" } as never)
    ).rejects.toBeInstanceOf(DonorReportQuotaExhaustedError);
  });

  it("maps a profile 402 to the profile-quota error", async () => {
    mockApiPost.mockRejectedValue(profileCap402());
    const error = await createDonorHandle({ opaqueLabel: "Client A" }).catch((e) => e);
    expect(error).toBeInstanceOf(DonorProfileQuotaExhaustedError);
    expect(isProfileQuotaExhausted(error)).toBe(true);
  });

  it("maps a diligence 402 to the diligence-quota error", async () => {
    mockApiPost.mockRejectedValue(quota402("diligence", "no diligence"));
    const error = await askQuestions("r1", "c1").catch((e) => e);
    expect(error).toBeInstanceOf(DonorDiligenceQuotaExhaustedError);
    expect(isDiligenceQuotaExhausted(error)).toBe(true);
  });

  it("maps an intro 402 to the intro-quota error, distinct from the 422 email path", async () => {
    mockApiPost.mockRejectedValue(quota402("intros", "no intros"));
    const error = await requestIntro("r1", "c1").catch((e) => e);
    expect(error).toBeInstanceOf(DonorIntroQuotaExhaustedError);
    expect(isIntroQuotaExhausted(error)).toBe(true);
  });

  it("keeps the 422 email-required intro path as a recoverable result, not a throw", async () => {
    mockApiPost.mockRejectedValue(
      new HttpError(422, {
        endpoint: "/v2/donor-research/reports/r1/candidates/c1/intro-requests",
        method: "POST",
        body: { message: "email required" },
      })
    );
    const result = await requestIntro("r1", "c1");
    expect(result.kind).toBe("email_required");
  });
});
