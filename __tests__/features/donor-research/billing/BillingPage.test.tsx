/**
 * @file The billing page must not put backend response text on screen
 * (CWE-209 — the billing service copies it into the thrown error), and must
 * not render an exhausted allowance as the number `0`.
 */
import { screen } from "@testing-library/react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useDonorEntitlement, useOpenBillingPortal } from "@/hooks/useDonorBilling";
import { BillingPage } from "@/src/features/donor-research/billing/BillingPage";
import type { DonorEntitlement } from "@/types/donor-research-billing";
import { renderWithProviders } from "../../../utils/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

vi.mock("@/hooks/useDonorBilling", () => ({
  useDonorEntitlement: vi.fn(),
  useOpenBillingPortal: vi.fn(),
  donorEntitlementQueryKey: ["donor-research", "billing", "subscription"],
}));

vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

// The dialog owns its own billing queries; this page test is about the page.
vi.mock("@/src/features/donor-research/billing/UpgradeDialog", () => ({
  UpgradeDialog: () => null,
}));

const mockUseDonorEntitlement = vi.mocked(useDonorEntitlement);
const mockUseOpenBillingPortal = vi.mocked(useOpenBillingPortal);
const mockErrorManager = vi.mocked(errorManager);

function entitlement(overrides: Partial<DonorEntitlement> = {}): DonorEntitlement {
  return {
    advisorId: "advisor-1",
    plan: "starter",
    planLabel: "Nonprofit Research — Starter",
    status: "active",
    reportsIncluded: 10,
    reportsUsed: 7,
    freeReportsGranted: 2,
    freeReportsUsed: 2,
    reportsRemaining: 3,
    canCreateReport: true,
    introsIncluded: 2,
    introsUsed: 1,
    introsRemaining: 1,
    canRequestIntro: true,
    diligenceIncluded: 5,
    diligenceUsed: 0,
    diligenceRemaining: 5,
    canAskDiligence: true,
    profilesIncluded: 3,
    profilesUsed: 1,
    profilesRemaining: 2,
    canCreateProfile: true,
    currentPeriodStart: "2026-08-01T00:00:00.000Z",
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    hasBillingAccount: true,
    billingEnabled: true,
    ...overrides,
  };
}

type EntitlementQuery = ReturnType<typeof useDonorEntitlement>;
type PortalMutation = ReturnType<typeof useOpenBillingPortal>;

function serveEntitlement(partial: Partial<EntitlementQuery>) {
  mockUseDonorEntitlement.mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...partial,
  } as unknown as EntitlementQuery);
}

function servePortal(partial: Partial<PortalMutation> = {}) {
  mockUseOpenBillingPortal.mockReturnValue({
    mutate: vi.fn(),
    error: null,
    isPending: false,
    isError: false,
    ...partial,
  } as unknown as PortalMutation);
}

beforeEach(() => {
  vi.clearAllMocks();
  servePortal();
});

describe("BillingPage error copy", () => {
  it("renders fixed copy instead of the backend message, and reports the original", () => {
    const error = new Error("MongoServerError: E11000 duplicate key on advisors.stripe_customer");
    serveEntitlement({ isError: true, error });

    renderWithProviders(<BillingPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong reading your subscription. Please try again."
    );
    expect(screen.queryByText(/MongoServerError/)).not.toBeInTheDocument();
    expect(mockErrorManager).toHaveBeenCalledWith(
      "Error loading donor-research entitlement",
      error
    );
  });

  it("renders fixed copy for a portal failure", () => {
    const error = new Error("Stripe: no such customer cus_123 (request id req_abc)");
    serveEntitlement({ data: entitlement() });
    servePortal({ isError: true, error });

    renderWithProviders(<BillingPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't open the billing portal. Please try again in a moment."
    );
    expect(screen.queryByText(/cus_123/)).not.toBeInTheDocument();
    expect(mockErrorManager).toHaveBeenCalledWith(
      "Error opening donor-research billing portal",
      error
    );
  });
});

describe("BillingPage counters", () => {
  it("states an exhausted allowance rather than rendering 0", () => {
    serveEntitlement({
      data: entitlement({
        reportsRemaining: 0,
        introsRemaining: 0,
        diligenceRemaining: 0,
        profilesRemaining: 0,
        profilesUsed: 3,
      }),
    });

    renderWithProviders(<BillingPage />);

    // Three metered dimensions read "None left"; the profile cap reads "At limit".
    expect(screen.getAllByText("None left")).toHaveLength(3);
    expect(screen.getByText("At limit")).toBeInTheDocument();
    // The upgrade affordance is unchanged.
    expect(screen.getByRole("button", { name: "Change plan" })).toBeInTheDocument();
  });

  it("still renders a live count", () => {
    serveEntitlement({ data: entitlement() });

    renderWithProviders(<BillingPage />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("None left")).not.toBeInTheDocument();
  });
});
