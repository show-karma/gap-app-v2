/**
 * @file The header quota chip. At zero it states the status instead of
 * counting — a "0" in the slot that normally holds a spendable balance reads
 * as a number to act on — while keeping the upgrade affordance beside it.
 */
import { screen } from "@testing-library/react";
import { useDonorEntitlement } from "@/hooks/useDonorBilling";
import { ReportQuotaBadge } from "@/src/features/donor-research/billing/ReportQuotaBadge";
import type { DonorEntitlement } from "@/types/donor-research-billing";
import { renderWithProviders } from "../../../utils/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

vi.mock("@/hooks/useDonorBilling", () => ({ useDonorEntitlement: vi.fn() }));

const mockUseDonorEntitlement = vi.mocked(useDonorEntitlement);

function entitlement(reportsRemaining: number): DonorEntitlement {
  return {
    advisorId: "advisor-1",
    plan: "starter",
    planLabel: "Nonprofit Research — Starter",
    status: "active",
    reportsIncluded: 10,
    reportsUsed: 10,
    freeReportsGranted: 2,
    freeReportsUsed: 2,
    reportsRemaining,
    canCreateReport: reportsRemaining > 0,
    introsIncluded: 2,
    introsUsed: 0,
    introsRemaining: 2,
    canRequestIntro: true,
    diligenceIncluded: 5,
    diligenceUsed: 0,
    diligenceRemaining: 5,
    canAskDiligence: true,
    profilesIncluded: 3,
    profilesUsed: 1,
    profilesRemaining: 2,
    canCreateProfile: true,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasBillingAccount: true,
    billingEnabled: true,
  };
}

function serve(data: DonorEntitlement | undefined) {
  mockUseDonorEntitlement.mockReturnValue({ data } as unknown as ReturnType<
    typeof useDonorEntitlement
  >);
}

beforeEach(() => vi.clearAllMocks());

describe("ReportQuotaBadge", () => {
  it("states the status instead of counting zero, keeping the upgrade chip", () => {
    serve(entitlement(0));

    renderWithProviders(<ReportQuotaBadge />);

    expect(screen.getByText("No reports left")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("upgrade")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "No reports left — open billing" })
    ).toBeInTheDocument();
  });

  it("counts a live allowance", () => {
    serve(entitlement(3));

    renderWithProviders(<ReportQuotaBadge />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("reports left")).toBeInTheDocument();
    expect(screen.queryByText("upgrade")).not.toBeInTheDocument();
  });

  it("renders a dash rather than a fabricated count while the entitlement is unknown", () => {
    serve(undefined);

    renderWithProviders(<ReportQuotaBadge />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("No reports left")).not.toBeInTheDocument();
  });
});
