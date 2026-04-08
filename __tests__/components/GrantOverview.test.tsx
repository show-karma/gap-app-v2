import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Zustand stores
const mockGrantStore = {
  grant: undefined as any,
  loading: false,
  refreshGrant: vi.fn(),
};

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn(() => mockGrantStore),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn(() => false),
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
      const { chainNameDictionary } = require("@/utilities/chainNameDictionary");
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
});
