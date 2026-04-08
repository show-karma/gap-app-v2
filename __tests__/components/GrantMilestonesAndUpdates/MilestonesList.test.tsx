import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MilestonesList } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestonesList";
import type { Grant } from "@/types/v2/grant";

// Mock payout config hook
const mockPayoutConfig = {
  isLoading: false,
  data: null as any,
};
vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  usePayoutConfigByGrantPublic: () => mockPayoutConfig,
}));

vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDetails",
  () => ({
    MilestoneDetails: ({
      milestone,
      allocationAmount,
    }: {
      milestone: any;
      allocationAmount?: string;
    }) => (
      <div data-testid="milestone-details">
        <span data-testid="milestone-title">{milestone.title}</span>
        {allocationAmount && <span data-testid="allocation-amount">{allocationAmount}</span>}
      </div>
    ),
  })
);

vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/GrantUpdate",
  () => ({ GrantUpdate: () => null })
);

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const baseGrant: Grant = {
  uid: "0xgrant123",
  milestones: [
    { uid: "0xm1", title: "Deploy contracts", description: "", endsAt: 9999999999, chainID: 10 },
    { uid: "0xm2", title: "Launch app", description: "", endsAt: 9999999999, chainID: 10 },
  ],
  updates: [],
} as unknown as Grant;

describe("MilestonesList — allocation amount display", () => {
  beforeEach(() => {
    mockPayoutConfig.data = null;
  });

  it("shows $-prefixed amount next to milestone title when allocation has pure numeric amount", () => {
    mockPayoutConfig.data = {
      milestoneAllocations: [
        { milestoneUID: "0xm1", amount: "30000" },
        { milestoneUID: "0xm2", amount: "20000" },
      ],
    };

    renderWithQueryClient(<MilestonesList grant={baseGrant} />);

    const amounts = screen.getAllByTestId("allocation-amount");
    expect(amounts[0]).toHaveTextContent("$30,000");
    expect(amounts[1]).toHaveTextContent("$20,000");
  });

  it("shows token-suffixed amount as-is without $ prefix when amount contains a token symbol", () => {
    mockPayoutConfig.data = {
      milestoneAllocations: [{ milestoneUID: "0xm1", amount: "30000 OP" }],
    };

    renderWithQueryClient(<MilestonesList grant={baseGrant} />);

    const amounts = screen.getAllByTestId("allocation-amount");
    expect(amounts[0]).toHaveTextContent("30,000 OP");
    expect(amounts[0].textContent).not.toMatch(/^\$/);
  });

  it("shows no allocation badge when payout config has no milestoneUID-linked allocations", () => {
    mockPayoutConfig.data = {
      milestoneAllocations: [{ amount: "30000" }], // no milestoneUID
    };

    renderWithQueryClient(<MilestonesList grant={baseGrant} />);

    expect(screen.queryByTestId("allocation-amount")).not.toBeInTheDocument();
  });

  it("shows no allocation badge when grant has no payout config", () => {
    mockPayoutConfig.data = null;

    renderWithQueryClient(<MilestonesList grant={baseGrant} />);

    expect(screen.queryByTestId("allocation-amount")).not.toBeInTheDocument();
  });

  it("should_show_token_currency_instead_of_dollar_when_grant_has_currency_and_amount_is_pure_number", () => {
    mockPayoutConfig.data = {
      milestoneAllocations: [{ milestoneUID: "0xm1", amount: "30000" }],
    };

    const grantWithCurrency: Grant = {
      ...baseGrant,
      details: { title: "My Grant", currency: "OP" },
    } as unknown as Grant;

    renderWithQueryClient(<MilestonesList grant={grantWithCurrency} />);

    const amounts = screen.getAllByTestId("allocation-amount");
    expect(amounts[0]).toHaveTextContent("30,000 OP");
    expect(amounts[0].textContent).not.toMatch(/^\$/);
  });

  it("should_preserve_embedded_token_in_amount_even_when_grant_has_different_currency", () => {
    mockPayoutConfig.data = {
      milestoneAllocations: [{ milestoneUID: "0xm1", amount: "30000 OP" }],
    };

    const grantWithCurrency: Grant = {
      ...baseGrant,
      details: { title: "My Grant", currency: "USDC" },
    } as unknown as Grant;

    renderWithQueryClient(<MilestonesList grant={grantWithCurrency} />);

    const amounts = screen.getAllByTestId("allocation-amount");
    expect(amounts[0]).toHaveTextContent("30,000 OP");
  });
});
