/**
 * @file Tests for GrantCompletion component error handling
 * @description Verifies that errors during grant completion are shown to the user
 *
 * BUG: The catch block in CompleteGrant.tsx only calls errorManager() which
 * silently swallows errors containing "reject". It does NOT call showError()
 * from useAttestationToast, so the user sees the button loading then stopping
 * with no feedback.
 *
 * Compare with useGrantCompletion.ts (reviewer flow) which properly calls
 * showError() for all error cases.
 */

// Mock ESM modules first
vi.mock("@/utilities/gasless", () => ({
  createGaslessClient: vi.fn().mockResolvedValue(null),
  getGaslessSigner: vi.fn().mockResolvedValue(null),
  isChainSupportedForGasless: vi.fn().mockReturnValue(false),
  createPrivySignerForGasless: vi.fn().mockResolvedValue(null),
  getChainGaslessConfig: vi.fn().mockReturnValue(null),
  getProviderForChain: vi.fn().mockReturnValue(null),
  SUPPORTED_GASLESS_CHAINS: [],
  GaslessProviderError: class GaslessProviderError extends Error {},
}));

vi.mock("@/hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: vi.fn(() => ({
    getSignerForChain: vi.fn().mockResolvedValue(null),
    getAttestationSigner: vi.fn().mockResolvedValue({}),
    isGaslessAvailable: false,
    attestationAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    isLoading: false,
    error: null,
  })),
}));

const {
  mockShowError,
  mockShowSuccess,
  mockStartAttestation,
  mockChangeStepperStep,
  mockSetIsStepper,
  mockSetupChainAndWallet,
  mockErrorManager,
  mockUseAccount,
  mockRefetchGrants,
  mockOpenShareDialog,
  mockIsProjectOwner,
  mockIsProjectAdmin,
  mockIsOwner,
  mockIsCommunityAdmin,
} = vi.hoisted(() => ({
  mockShowError: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockStartAttestation: vi.fn(),
  mockChangeStepperStep: vi.fn(),
  mockSetIsStepper: vi.fn(),
  mockSetupChainAndWallet: vi.fn().mockResolvedValue(null),
  mockErrorManager: vi.fn(),
  mockUseAccount: vi.fn(),
  mockRefetchGrants: vi.fn(),
  mockOpenShareDialog: vi.fn(),
  mockIsProjectOwner: { current: true },
  mockIsProjectAdmin: { current: false },
  mockIsOwner: { current: false },
  mockIsCommunityAdmin: { current: false },
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: mockStartAttestation,
    changeStepperStep: mockChangeStepperStep,
    setIsStepper: mockSetIsStepper,
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    updateStep: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  })),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: mockErrorManager,
}));

vi.mock("wagmi", () => ({
  useAccount: mockUseAccount,
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({ switchChainAsync: vi.fn() })),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((obj) => obj),
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utilities/funding-programs", () => ({
  isFundingProgramGrant: vi.fn().mockReturnValue(false),
}));

vi.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/project-grants.service", () => ({
  getProjectGrants: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useTracks", () => ({
  useTracksForProgram: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({
    refetch: mockRefetchGrants,
    grants: [],
    isLoading: false,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/project/test/funding/0xgrant/complete-grant"),
}));

// Mock stores
const mockGrant = {
  uid: "0xgrant123",
  chainID: 10,
  details: { title: "Test Grant", programId: null, selectedTrackIds: [] },
  community: null,
  completed: null,
} as any;

const mockProject = {
  uid: "0xproject456",
  details: { slug: "test-project", title: "Test Project" },
} as any;

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn(() => ({
    grant: mockGrant,
  })),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector?: any) => {
    const state = {
      project: mockProject,
      refreshProject: vi.fn(),
      isProjectAdmin: mockIsProjectAdmin.current,
      isProjectOwner: mockIsProjectOwner.current,
    };
    return selector ? selector(state) : state;
  }),
  useOwnerStore: vi.fn((selector?: any) => {
    const state = { isOwner: mockIsOwner.current };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/store/communityAdmin", () => ({
  useCommunityAdminStore: vi.fn((selector?: any) => {
    const state = { isCommunityAdmin: mockIsCommunityAdmin.current };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: vi.fn(() => ({
    openShareDialog: mockOpenShareDialog,
  })),
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ onChange }: any) => (
    <textarea data-testid="markdown-editor" onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("./CompletionRequirements/FundingProgramFields", () => ({
  FundingProgramFields: () => null,
}));

vi.mock("./CompletionRequirements/TrackExplanations", () => ({
  TrackExplanations: () => null,
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      GRANT: vi.fn(() => "/project/test/funding/0xgrant123"),
      SCREENS: {
        SELECTED_SCREEN: vi.fn(() => "/project/test/funding/0xgrant123/complete-grant"),
      },
    },
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: vi.fn(() => "/attestation-listener"),
  },
}));

vi.mock("@/utilities/share/text", () => ({
  SHARE_TEXTS: {
    GRANT_COMPLETED: vi.fn(() => "Grant completed!"),
  },
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    GRANT: {
      MARK_AS_COMPLETE: {
        SUCCESS: "Grant completed successfully",
        ERROR: "There was an error doing the grant completion.",
      },
    },
  },
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GrantCompletion } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant";

describe("GrantCompletion - Error Handling", () => {
  const mockGapClient = {
    fetch: {
      projectById: vi.fn(),
    },
  };
  const mockWalletSigner = { getAddress: vi.fn() };
  const mockGrantInstance = {
    uid: "0xgrant123",
    complete: vi.fn(),
  };

  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ chain: { id: 10 }, address: "0xuser123" });
    // Default to authorized user for error handling tests
    mockIsProjectOwner.current = true;
    mockIsProjectAdmin.current = false;
    mockIsOwner.current = false;
    mockIsCommunityAdmin.current = false;
    // Suppress expected console.error from error handling
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function setupSuccessfulChainAndProject() {
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: mockGapClient,
      walletSigner: mockWalletSigner,
      chainId: 10,
    });

    mockGapClient.fetch.projectById.mockResolvedValue({
      uid: "0xproject456",
      grants: [mockGrantInstance],
    });
  }

  it("should show error toast when grant completion throws a general error", async () => {
    setupSuccessfulChainAndProject();
    mockGrantInstance.complete.mockRejectedValue(new Error("Network timeout"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("There was an error doing the grant completion.");
    });
  });

  it("should show cancellation message when user rejects the transaction", async () => {
    setupSuccessfulChainAndProject();
    const userRejectionError = new Error("User rejected the request");
    (userRejectionError as any).code = 4001;
    mockGrantInstance.complete.mockRejectedValue(userRejectionError);

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Grant completion cancelled");
    });
  });

  it("should show error toast when SDK throws error with 'rejected' in message", async () => {
    // This is the KEY bug scenario: SDK errors containing "reject" (not user rejection)
    // are silently swallowed by errorManager, leaving the user with no feedback
    setupSuccessfulChainAndProject();
    mockGrantInstance.complete.mockRejectedValue(new Error("Transaction rejected by the network"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // The user MUST see an error - not have it silently swallowed
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it("should reset loading state after an error", async () => {
    setupSuccessfulChainAndProject();
    mockGrantInstance.complete.mockRejectedValue(new Error("Something went wrong"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Button should not be in loading state after error
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should show cancellation for Privy embedded wallet 'Signature rejected' error", async () => {
    // Privy embedded wallet emits "Signature rejected" without code 4001
    // when user closes the signing modal. The code gets lost during SDK wrapping.
    setupSuccessfulChainAndProject();
    mockGrantInstance.complete.mockRejectedValue(new Error("Signature rejected"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Grant completion cancelled");
    });
  });

  it("should show cancellation for errors with 'user denied' in message", async () => {
    setupSuccessfulChainAndProject();
    mockGrantInstance.complete.mockRejectedValue(new Error("user denied transaction signature"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Grant completion cancelled");
    });
  });

  it("should show error when project fetch fails", async () => {
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: mockGapClient,
      walletSigner: mockWalletSigner,
      chainId: 10,
    });
    mockGapClient.fetch.projectById.mockRejectedValue(new Error("Project fetch failed"));

    render(<GrantCompletion />);

    const submitButton = screen.getByRole("button", { name: /mark grant as complete/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });
});

describe("GrantCompletion - Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ chain: { id: 10 }, address: "0xuser123" });
  });

  it("should not render the form when user is not authorized", () => {
    // Set all permission flags to false
    mockIsProjectOwner.current = false;
    mockIsProjectAdmin.current = false;
    mockIsOwner.current = false;
    mockIsCommunityAdmin.current = false;

    render(<GrantCompletion />);

    expect(
      screen.queryByRole("button", { name: /mark grant as complete/i })
    ).not.toBeInTheDocument();
  });

  it("should render the form when user is the project owner", () => {
    mockIsProjectOwner.current = true;
    mockIsProjectAdmin.current = false;
    mockIsOwner.current = false;
    mockIsCommunityAdmin.current = false;

    render(<GrantCompletion />);

    expect(screen.getByRole("button", { name: /mark grant as complete/i })).toBeInTheDocument();
  });

  it("should render the form when user is a community admin", () => {
    mockIsProjectOwner.current = false;
    mockIsProjectAdmin.current = false;
    mockIsOwner.current = false;
    mockIsCommunityAdmin.current = true;

    render(<GrantCompletion />);

    expect(screen.getByRole("button", { name: /mark grant as complete/i })).toBeInTheDocument();
  });
});
