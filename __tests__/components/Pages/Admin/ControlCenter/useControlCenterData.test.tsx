import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useControlCenterData } from "@/components/Pages/Admin/ControlCenter/useControlCenterData";

vi.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: () => ({
    data: { uid: "0xCommunity", details: { slug: "test" } },
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: () => ({ hasAccess: true, isLoading: false }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: () => ({ isEnabled: false }),
  useKycBatchStatuses: () => ({ statuses: new Map(), isLoading: false }),
}));

const mockUseCommunityPayouts = vi.fn();
vi.mock("@/src/features/payout-disbursement", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/features/payout-disbursement")
  >("@/src/features/payout-disbursement");
  return {
    ...actual,
    useCommunityPayouts: (...args: unknown[]) => mockUseCommunityPayouts(...args),
    usePayoutConfigsByCommunity: () => ({ data: [] }),
  };
});

function makePayoutPayload(
  resolvedProjectName: string | undefined,
  title: string
) {
  return {
    payload: [
      {
        project: {
          uid: "0xProject",
          title,
          slug: "project-slug",
          chainID: 10,
          payoutAddress: null,
          chainPayoutAddress: null,
          adminPayoutAddress: "0xAdmin",
          resolvedProjectName,
        },
        grant: {
          uid: "0xGrant",
          title: "Grant",
          chainID: 10,
          payoutAmount: "1000",
          currency: "USDC",
          payoutAddress: null,
          programId: "100",
          adminPayoutAmount: "1000",
          invoiceRequired: false,
        },
        disbursements: { totalDisbursed: "0", totalsByToken: [], status: "NOT_STARTED", history: [] },
        agreement: null,
        milestoneInvoices: [],
        paidMilestoneCount: 0,
      },
    ],
    pagination: { totalCount: 1 },
  };
}

const baseFilters = {
  programId: null,
  agreementFilter: undefined,
  invoiceFilter: undefined,
  disbursementFilter: undefined,
  kycFilter: undefined,
  searchQuery: "",
  sortBy: undefined,
  sortOrder: undefined,
  currentPage: 1,
  itemsPerPage: 10,
} as const;

describe("useControlCenterData - team name resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_use_resolvedProjectName_when_provided_by_payouts_response", () => {
    mockUseCommunityPayouts.mockReturnValue({
      data: makePayoutPayload("Awesome Team", "Karma Title"),
      isLoading: false,
      error: null,
      invalidate: vi.fn(),
    });

    const { result } = renderHookWithProviders(() =>
      useControlCenterData("test", true, baseFilters)
    );

    expect(result.current.tableData[0].projectName).toBe("Awesome Team");
  });

  it("should_fallback_to_project_title_when_resolvedProjectName_is_missing", () => {
    mockUseCommunityPayouts.mockReturnValue({
      data: makePayoutPayload(undefined, "Karma Title"),
      isLoading: false,
      error: null,
      invalidate: vi.fn(),
    });

    const { result } = renderHookWithProviders(() =>
      useControlCenterData("test", true, baseFilters)
    );

    expect(result.current.tableData[0].projectName).toBe("Karma Title");
  });

  it("should_fallback_to_project_title_when_resolvedProjectName_is_empty_string", () => {
    mockUseCommunityPayouts.mockReturnValue({
      data: makePayoutPayload("", "Karma Title"),
      isLoading: false,
      error: null,
      invalidate: vi.fn(),
    });

    const { result } = renderHookWithProviders(() =>
      useControlCenterData("test", true, baseFilters)
    );

    expect(result.current.tableData[0].projectName).toBe("Karma Title");
  });
});
