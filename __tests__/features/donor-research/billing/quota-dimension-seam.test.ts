/**
 * Cross-service seam: every metered donor-research action must map its backend
 * 402 to the dimension-specific error the UI keys off, and the pack checkout
 * must hit the pack endpoint. A drift here means an exhausted intro/diligence/
 * profile opens the wrong dialog (or a generic red error) even though CI is
 * green on both services — exactly the class the pricing plan's §3 guards.
 *
 * The dimension is read from the 402 BODY (`dimension`), which the indexer's
 * `donorResearchQuotaPreHandler` / `donorResearchProfileCapPreHandler` always
 * send; the call site is only the fallback.
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
  DonorIntroPackRequiresSubscriptionError,
  DonorIntroQuotaExhaustedError,
  DonorProfileQuotaExhaustedError,
  DonorReportQuotaExhaustedError,
  DonorSubscriptionAlreadyActiveError,
  donorQuotaErrorFrom,
  isDiligenceQuotaExhausted,
  isIntroQuotaExhausted,
  isProfileQuotaExhausted,
  startBillingCheckout,
  startPackCheckout,
} from "@/services/donor-research-billing.service";
import { HttpError } from "@/utilities/api/errors";
import { DONOR_BILLING_ENDPOINTS } from "@/utilities/donorBillingEndpoints";

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

  it("maps a profile 402 to the profile-quota error and keeps the cap counters", async () => {
    mockApiPost.mockRejectedValue(profileCap402());
    const error = await createDonorHandle({ opaqueLabel: "Client A" }).catch((e) => e);
    expect(error).toBeInstanceOf(DonorProfileQuotaExhaustedError);
    expect(isProfileQuotaExhausted(error)).toBe(true);
    expect(error.refusal).toMatchObject({ profilesIncluded: 3, profilesUsed: 3, plan: "starter" });
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

  describe("donorQuotaErrorFrom", () => {
    it("trusts the body's dimension over the call site", () => {
      // The report-create route is also behind the profile cap in some
      // configurations; the body — not the endpoint — says which gate refused.
      const error = donorQuotaErrorFrom(profileCap402(), "reports");
      expect(error).toBeInstanceOf(DonorProfileQuotaExhaustedError);
      expect(error?.dimension).toBe("profiles");
    });

    it("falls back to the call site when the body names no dimension", () => {
      const bare = new HttpError(402, {
        endpoint: "/v2/donor-research/reports",
        method: "POST",
        body: { message: "Payment Required" },
      });
      expect(donorQuotaErrorFrom(bare, "reports")).toBeInstanceOf(DonorReportQuotaExhaustedError);
    });

    it("ignores a dimension the frontend does not know", () => {
      const unknown = new HttpError(402, {
        endpoint: "/v2/donor-research/reports",
        method: "POST",
        body: { dimension: "teleportation", message: "nope" },
      });
      expect(donorQuotaErrorFrom(unknown, "diligence")).toBeInstanceOf(
        DonorDiligenceQuotaExhaustedError
      );
    });

    it("returns null for anything that is not a 402", () => {
      const rateLimited = new HttpError(429, {
        endpoint: "/v2/donor-research/reports",
        method: "POST",
        body: { message: "slow down" },
      });
      expect(donorQuotaErrorFrom(rateLimited, "reports")).toBeNull();
      expect(donorQuotaErrorFrom(new Error("boom"), "reports")).toBeNull();
    });
  });

  describe("checkout refusals that are not quota", () => {
    it("maps a 409 subscription checkout to the already-active error", async () => {
      mockApiPost.mockRejectedValue(
        new HttpError(409, {
          endpoint: DONOR_BILLING_ENDPOINTS.CHECKOUT,
          method: "POST",
          body: {
            error: "Subscription Already Active",
            message: "Advisor a1 already has an active subscription",
          },
        })
      );

      const error = await startBillingCheckout({
        plan: "pro",
        successUrl: "https://x/ok",
        cancelUrl: "https://x/no",
      }).catch((e) => e);

      expect(error).toBeInstanceOf(DonorSubscriptionAlreadyActiveError);
      expect(error.message).toContain("already has an active subscription");
    });

    it("maps a 403 intro-pack purchase to the subscription-required error", async () => {
      mockApiPost.mockRejectedValue(
        new HttpError(403, {
          endpoint: DONOR_BILLING_ENDPOINTS.PACK_CHECKOUT,
          method: "POST",
          body: {
            error: "Intro Pack Requires Subscription",
            message: "warm intros are a subscriber benefit",
          },
        })
      );

      const error = await startPackCheckout({
        pack: "intros_5",
        successUrl: "https://x/ok",
        cancelUrl: "https://x/no",
      }).catch((e) => e);

      expect(error).toBeInstanceOf(DonorIntroPackRequiresSubscriptionError);
    });
  });

  describe("endpoint constants match the indexer routes", () => {
    // Verified against gap-indexer
    // `app/modules/v2/api/routes/donor-research/donor-research.routes.ts`.
    it("pins every billing path", () => {
      expect(DONOR_BILLING_ENDPOINTS.PLANS).toBe("/v2/donor-research/billing/plans");
      expect(DONOR_BILLING_ENDPOINTS.SUBSCRIPTION).toBe("/v2/donor-research/billing/subscription");
      expect(DONOR_BILLING_ENDPOINTS.CHECKOUT).toBe("/v2/donor-research/billing/checkout");
      expect(DONOR_BILLING_ENDPOINTS.PACK_CHECKOUT).toBe(
        "/v2/donor-research/billing/packs/checkout"
      );
      expect(DONOR_BILLING_ENDPOINTS.PORTAL).toBe("/v2/donor-research/billing/portal");
    });
  });
});
