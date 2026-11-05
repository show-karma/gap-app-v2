import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";

// Mock Zustand stores
const mockGrantStore = {
  grant: undefined as any,
  loading: false,
  refreshGrant: vi.fn(),
};

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn((selector?: (state: typeof mockGrantStore) => unknown) =>
    selector ? selector(mockGrantStore) : mockGrantStore
  ),
}));

const mockOwnerStore = {
  isOwner: false,
};

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn((selector?: (state: typeof mockOwnerStore) => unknown) =>
    selector ? selector(mockOwnerStore) : mockOwnerStore
  ),
}));

const mockPayoutConfigQuery = {
  data: undefined as any,
  isLoading: false,
};
const mockUsePayoutConfigByGrantPublic = vi.fn(
  (_grantUID: string, _options?: { enabled?: boolean }) => mockPayoutConfigQuery
);

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  usePayoutConfigByGrantPublic: (grantUID: string, options?: { enabled?: boolean }) =>
    mockUsePayoutConfigByGrantPublic(grantUID, options),
}));

const mockGetTokenByAddressAndChain = vi.fn(
  (_address: string, _chainId: number): { symbol: string } | undefined => ({ symbol: "USDC" })
);

vi.mock("@/constants/supportedTokens", () => ({
  getTokenByAddressAndChain: (address: string, chainId: number) =>
    mockGetTokenByAddressAndChain(address, chainId),
}));

// Mock heavy/external dependencies
vi.mock("@/components/Pages/Grants/MilestonesAndUpdates", () => ({
  GrantCompletionCard: () => <div data-testid="grant-completion-card" />,
}));

vi.mock("@/components/TrackTags", () => ({
  TrackTags: () => <div data-testid="track-tags" />,
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: any) => <div data-testid="markdown-preview">{source}</div>,
}));

vi.mock("@/components/Pages/Project/Grants/components/GrantPercentage", () => ({
  GrantPercentage: () => <span data-testid="grant-percentage" />,
}));

vi.mock("@/components/Pages/Project/Loading/Grants/Overview", () => ({
  ProjectGrantsOverviewLoading: () => <div data-testid="loading" />,
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/utilities/chainImgDictionary", () => ({
  chainImgDictionary: vi.fn(() => "/chain-img.png"),
}));

vi.mock("@/utilities/chainNameDictionary", () => ({
  chainNameDictionary: vi.fn(() => "Optimism"),
}));

vi.mock("@/utilities/formatCurrency", () => ({
  __esModule: true,
  default: vi.fn((val: number) => val.toFixed(2)),
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: vi.fn(() => "Jan 1, 2024"),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      ALL_GRANTS: vi.fn(() => "/community/test/grants"),
    },
  },
}));

import { GrantOverview } from "@/components/Pages/Project/Grants/Overview";

const createMockGrant = (overrides = {}) => ({
  uid: "0xgrant123",
  chainID: 10,
  communityUID: "community-1",
  community: {
    chainID: 10,
    uid: "0xcommunity",
    details: {
      name: "Test Community",
      slug: "test-community",
      imageURL: "https://example.com/logo.png",
    },
  },
  details: {
    title: "Test Grant",
    description: "A test grant description",
    amount: "1000",
    proposalURL: "https://example.com/proposal",
    startDate: "2024-01-01",
    receivedDate: "2024-02-01",
  },
  milestones: [],
  updates: [],
  ...overrides,
});

describe("GrantOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrantStore.grant = createMockGrant();
    mockGrantStore.loading = false;
    mockPayoutConfigQuery.data = undefined;
    mockPayoutConfigQuery.isLoading = false;
  });

  describe("Network display", () => {
    it("should NOT render a Network label in the Grant Overview section", () => {
      render(<GrantOverview />);

      // The Grant Overview section should not contain a "Network" label
      expect(screen.queryByText("Network")).not.toBeInTheDocument();
    });

    it("should NOT render the chain name in the Grant Overview section", () => {
      render(<GrantOverview />);

      // chainNameDictionary returns "Optimism" in our mock - it should not appear
      // (We check that the network row is not rendered, not just the label)
      expect(chainNameDictionary).not.toHaveBeenCalled();
    });
  });

  describe("Other Grant Overview fields still render", () => {
    it("should render the Community label", () => {
      render(<GrantOverview />);

      expect(screen.getByText("Community")).toBeInTheDocument();
    });

    it("should render the community name", () => {
      render(<GrantOverview />);

      expect(screen.getByText("Test Community")).toBeInTheDocument();
    });

    it("should render the Grant Overview heading", () => {
      render(<GrantOverview />);

      expect(screen.getByText("Grant Overview")).toBeInTheDocument();
    });

    it("should render grant data stats like Total Grant Amount", () => {
      render(<GrantOverview />);

      expect(screen.getByText("Total Grant Amount")).toBeInTheDocument();
    });
  });
  describe("Total Grant Amount source", () => {
    const grantWithoutAmount = () =>
      createMockGrant({
        details: { title: "Test Grant", description: "desc", amount: "", currency: "" },
      });

    it("shows the grant's own amount when there is no payout config total", () => {
      mockPayoutConfigQuery.data = null;

      render(<GrantOverview />);

      expect(screen.getByText("1000.00")).toBeInTheDocument();
    });

    it("prefers the payout config total over the grant's own amount", () => {
      mockPayoutConfigQuery.data = { totalGrantAmount: "40000", tokenAddress: null, chainID: 8453 };

      render(<GrantOverview />);

      expect(screen.getByText("40000.00")).toBeInTheDocument();
      expect(screen.queryByText("1000.00")).not.toBeInTheDocument();
    });

    it("labels the payout total with the payout token, not the grant's currency field", () => {
      mockGrantStore.grant = createMockGrant({
        details: { title: "Test Grant", description: "desc", amount: "3000 DAI", currency: "0x0" },
      });
      mockPayoutConfigQuery.data = {
        totalGrantAmount: "7230",
        tokenAddress: "0xtoken",
        chainID: 10,
      };

      render(<GrantOverview />);

      expect(screen.getByText("7230.00 USDC")).toBeInTheDocument();
    });

    it("recognises USDC on a chain missing from the donation token list", () => {
      mockGetTokenByAddressAndChain.mockReturnValueOnce(undefined);
      mockPayoutConfigQuery.data = {
        totalGrantAmount: "7230",
        tokenAddress: "0xCEBA9300F2B948710D2653DD7B07F33A8B32118C",
        chainID: 42220,
      };

      render(<GrantOverview />);

      expect(screen.getByText("7230.00 USDC")).toBeInTheDocument();
    });

    it("shows no symbol for an unknown payout token", () => {
      mockGetTokenByAddressAndChain.mockReturnValueOnce(undefined);
      mockPayoutConfigQuery.data = {
        totalGrantAmount: "7230",
        tokenAddress: "0xunknown",
        chainID: 10,
      };

      render(<GrantOverview />);

      expect(screen.getByText("7230.00")).toBeInTheDocument();
    });

    it("keeps the grant's own text when the payout total is the same number", () => {
      mockGrantStore.grant = createMockGrant({
        details: { title: "Test Grant", description: "desc", amount: "58000 USD" },
      });
      mockPayoutConfigQuery.data = {
        totalGrantAmount: "58000",
        tokenAddress: "USD",
        chainID: 8453,
      };

      render(<GrantOverview />);

      expect(screen.getByText("58000.00 USD")).toBeInTheDocument();
    });

    it("holds the grant's own amount back while the payout config loads", () => {
      mockPayoutConfigQuery.isLoading = true;

      render(<GrantOverview />);

      expect(screen.getByText("Total Grant Amount")).toBeInTheDocument();
      expect(screen.queryByText("1000.00")).not.toBeInTheDocument();
    });

    it("shows the payout config total when the grant amount is empty", () => {
      mockGrantStore.grant = grantWithoutAmount();
      mockPayoutConfigQuery.data = { totalGrantAmount: "40000", tokenAddress: null, chainID: 8453 };

      render(<GrantOverview />);

      expect(mockUsePayoutConfigByGrantPublic).toHaveBeenCalledWith("0xgrant123", {
        enabled: true,
      });
      expect(screen.getByText("40000.00")).toBeInTheDocument();
    });

    it("appends the payout token symbol when the config has a token", () => {
      mockGrantStore.grant = grantWithoutAmount();
      mockPayoutConfigQuery.data = {
        totalGrantAmount: "40000",
        tokenAddress: "0xtoken",
        chainID: 10,
      };

      render(<GrantOverview />);

      expect(screen.getByText("40000.00 USDC")).toBeInTheDocument();
    });

    it("keeps the row with a placeholder while the payout config loads", () => {
      mockGrantStore.grant = grantWithoutAmount();
      mockPayoutConfigQuery.isLoading = true;

      render(<GrantOverview />);

      expect(screen.getByText("Total Grant Amount")).toBeInTheDocument();
    });

    it("hides the row when neither source has an amount", () => {
      mockGrantStore.grant = grantWithoutAmount();
      mockPayoutConfigQuery.data = { totalGrantAmount: "0", tokenAddress: null, chainID: 8453 };

      render(<GrantOverview />);

      expect(screen.queryByText("Total Grant Amount")).not.toBeInTheDocument();
    });
  });
});
