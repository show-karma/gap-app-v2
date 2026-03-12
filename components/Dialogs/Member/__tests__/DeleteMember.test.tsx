import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAccount } from "wagmi";
import { DeleteMemberDialog } from "../DeleteMember";

// --- Constants ---
const PROJECT_OWNER_ADDRESS = "0x22886c71a4c1fa2824bd86210ead1c310b3d7cf5";
const GHOST_MEMBER_ADDRESS = "0xb99842f945e804fa424ce30c7622a30c1ac77969";
const NORMAL_MEMBER_ADDRESS = "0x9f75582d2be13b5ee454161ee394daada8b39efa";
const PROJECT_UID = "0x9cdc5607d3da24a3b52f5d215d12cea0ffec0db98aa496963a595264e657f288";

// --- Mocks ---

// Mock next/dynamic to render nothing (DeleteDialog is lazy-loaded but unused in our tests)
jest.mock("next/dynamic", () => () => {
  const DynamicComponent = () => null;
  DynamicComponent.displayName = "DynamicComponent";
  return DynamicComponent;
});

// Mock headlessui for simpler dialog handling in tests
jest.mock("@headlessui/react", () => ({
  Dialog: Object.assign(
    ({ children, ...props }: any) => (
      <div data-testid="dialog" {...props}>
        {children}
      </div>
    ),
    {
      Title: ({ children, ...props }: any) => (
        <h3 data-testid="dialog-title" {...props}>
          {children}
        </h3>
      ),
      Panel: ({ children, ...props }: any) => (
        <div data-testid="dialog-panel" {...props}>
          {children}
        </div>
      ),
    }
  ),
  Transition: Object.assign(({ children, show }: any) => (show ? children : null), {
    Child: ({ children }: any) => children,
  }),
}));

// Radix tooltip mock
jest.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: any) => children,
  Root: ({ children }: any) => children,
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Content: ({ children }: any) => <div>{children}</div>,
}));

// Mock heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  TrashIcon: ({ className }: any) => <svg data-testid="trash-icon" className={className} />,
}));

// Mock the Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, disabled, isLoading, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

// Mock error manager
const mockErrorManager = jest.fn();
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: (...args: any[]) => mockErrorManager(...args),
}));

// Mock attestation toast
const mockStartAttestation = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockChangeStepperStep = jest.fn();
const mockSetIsStepper = jest.fn();

jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    changeStepperStep: mockChangeStepperStep,
    setIsStepper: mockSetIsStepper,
  }),
}));

// Mock useGap
jest.mock("@/hooks/useGap", () => ({
  useGap: () => ({ gap: {} }),
}));

// Mock off-chain revoke
const mockPerformOffChainRevoke = jest.fn();
jest.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: () => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  }),
}));

// Mock useWallet
jest.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: jest.fn(),
  }),
}));

// Mock fetchData
const mockFetchData = jest.fn();
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: (...args: any[]) => mockFetchData(...args),
}));

// Mock INDEXER
jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: (hash: string, chainId: number) =>
      `/attestations/index-by-transaction/${hash}/${chainId}`,
  },
}));

// Mock query client
jest.mock("@/utilities/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Mock getProjectById - THIS IS THE KEY MOCK for reproducing the bug
const mockGetProjectById = jest.fn();
jest.mock("@/utilities/sdk", () => ({
  getProjectById: (...args: any[]) => mockGetProjectById(...args),
}));

// Mock project store
const mockRefreshProject = jest.fn();
const mockProjectStoreState: Record<string, unknown> = {
  project: {
    uid: PROJECT_UID,
    chainID: 42220,
    owner: PROJECT_OWNER_ADDRESS,
    details: { slug: "tucop-wallet", title: "TuCOP Wallet" },
    members: [
      { address: PROJECT_OWNER_ADDRESS, role: "owner", joinedAt: "2025-05-15T21:45:37.000Z" },
      { address: GHOST_MEMBER_ADDRESS, role: "member", joinedAt: "2025-05-19T20:07:05.000Z" },
      { address: NORMAL_MEMBER_ADDRESS, role: "member", joinedAt: "2025-08-10T01:21:42.000Z" },
    ],
  },
  refreshProject: mockRefreshProject,
};

jest.mock("@/store", () => ({
  useProjectStore: jest.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockProjectStoreState);
    }
    return mockProjectStoreState;
  }),
}));

// Mock setupChainAndWallet - use relative path from source file because
// SWC resolves @/ aliases at compile time, so jest.mock("@/hooks/...") doesn't
// intercept imports within compiled source modules.
const mockSetupChainAndWallet = jest.fn();
jest.mock("../../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: false,
  }),
}));

describe("DeleteMemberDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Override useAccount to return the project owner's address
    (useAccount as jest.Mock).mockReturnValue({
      address: PROJECT_OWNER_ADDRESS,
      chain: { id: 42220 },
      isConnected: true,
    });

    // Default: setupChainAndWallet succeeds
    mockSetupChainAndWallet.mockResolvedValue({
      walletSigner: { provider: {} },
      gapClient: {},
    });
  });

  /**
   * Helper to open the confirmation dialog and click Continue.
   */
  async function openDialogAndConfirm(memberAddress: string) {
    render(<DeleteMemberDialog memberAddress={memberAddress} />);

    // Click the trash icon button to open the dialog
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    // Wait for dialog to appear and click Continue
    await waitFor(() => {
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue"));
  }

  describe("Bug reproduction: ghost member (V1/V2 data inconsistency)", () => {
    it("should handle ghost member by removing it from V2 when attestation is already revoked in V1", async () => {
      // SETUP: Simulate the real-world scenario where:
      // - The member 0xb998... is in the V2 projects collection (shown in UI via project store)
      // - But the MemberOf attestation was already revoked in V1 (SDK returns no member)
      //
      // The SDK-fetched project does NOT contain the ghost member:
      const sdkProjectWithoutGhostMember = {
        uid: PROJECT_UID,
        chainID: 42220,
        members: [
          {
            uid: "0xd90a079c20d16e2d099fbfd8cc0dd5be40142527394dab33e20bdbcaf36a5aed",
            recipient: PROJECT_OWNER_ADDRESS,
            chainID: 42220,
            revoke: jest.fn(),
            schema: { uid: "0xb4186a24" },
          },
          {
            uid: "0x0b3c802f1a57f14db5f183e06c7ad16875d0995d44961ad012f3a6a45ef2381d",
            recipient: NORMAL_MEMBER_ADDRESS,
            chainID: 42220,
            revoke: jest.fn(),
            schema: { uid: "0xb4186a24" },
          },
          // NOTE: GHOST_MEMBER_ADDRESS is intentionally ABSENT here
          // This simulates the attestation being already revoked in V1
        ],
      };

      mockGetProjectById.mockResolvedValue(sdkProjectWithoutGhostMember);

      // Mock the V2 API call to remove the ghost member
      mockFetchData.mockResolvedValue([{ success: true }, null]);

      // After cleanup, refreshProject returns project without the ghost member
      mockRefreshProject.mockResolvedValue({
        uid: PROJECT_UID,
        chainID: 42220,
        owner: PROJECT_OWNER_ADDRESS,
        details: { slug: "tucop-wallet", title: "TuCOP Wallet" },
        members: [
          { address: PROJECT_OWNER_ADDRESS, role: "owner", joinedAt: "2025-05-15T21:45:37.000Z" },
          { address: NORMAL_MEMBER_ADDRESS, role: "member", joinedAt: "2025-08-10T01:21:42.000Z" },
        ],
      });

      // ACT: Attempt to delete the ghost member
      await openDialogAndConfirm(GHOST_MEMBER_ADDRESS);

      // ASSERT: The ghost member should be removed successfully via V2 cleanup.
      // No error should be shown to the user — this should be a graceful removal.
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith("Member removed successfully");
      });

      // No error should have been shown
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it("should successfully remove a member that exists in both V1 and V2 data", async () => {
      // SETUP: Normal case — member exists in both V1 (SDK) and V2
      const mockRevoke = jest.fn().mockResolvedValue({
        tx: [{ hash: "0xabc123" }],
      });

      const sdkProjectWithMember = {
        uid: PROJECT_UID,
        chainID: 42220,
        members: [
          {
            uid: "0xd90a079c",
            recipient: PROJECT_OWNER_ADDRESS,
            chainID: 42220,
            revoke: jest.fn(),
            schema: { uid: "0xb4186a24" },
          },
          {
            uid: "0x0b3c802f",
            recipient: NORMAL_MEMBER_ADDRESS,
            chainID: 42220,
            revoke: mockRevoke,
            schema: { uid: "0xb4186a24" },
          },
        ],
      };

      mockGetProjectById.mockResolvedValue(sdkProjectWithMember);
      mockFetchData.mockResolvedValue([null, null]);

      // After revoke, refreshProject returns project without the member
      mockRefreshProject.mockResolvedValue({
        uid: PROJECT_UID,
        chainID: 42220,
        owner: PROJECT_OWNER_ADDRESS,
        details: { slug: "tucop-wallet", title: "TuCOP Wallet" },
        members: [
          { address: PROJECT_OWNER_ADDRESS, role: "owner", joinedAt: "2025-05-15T21:45:37.000Z" },
        ],
      });

      // ACT
      await openDialogAndConfirm(NORMAL_MEMBER_ADDRESS);

      // ASSERT: The on-chain revoke should be called
      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalled();
      });

      // The success message should be shown
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith("Member removed successfully");
      });
    });
  });
});
