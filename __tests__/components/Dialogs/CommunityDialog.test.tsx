import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";

// Mock Headless UI Dialog components
vi.mock("@headlessui/react", () => {
  const React = require("react");

  const TRANSITION_PROPS = [
    "appear",
    "show",
    "enter",
    "enterFrom",
    "enterTo",
    "leave",
    "leaveFrom",
    "leaveTo",
    "entered",
    "beforeEnter",
    "afterEnter",
    "beforeLeave",
    "afterLeave",
  ];

  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );
  MockDialog.Title = ({ children, as, ...props }: any) => {
    const Component = as || "h3";
    return <Component {...props}>{children}</Component>;
  };

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null;

    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionRoot.displayName = "Transition";

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionChild.displayName = "Transition.Child";

  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock react-hot-toast (used by ensureCorrectChain)
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: vi.fn(), success: vi.fn() },
}));

// Mock Heroicons
vi.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

// Track attest mock for controlling test flow
let mockAttest: vi.Mock;
let mockSetupChainAndWallet: vi.Mock;

// Mock hooks
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 1 },
  }),
  useChainId: () => 1,
  useWalletClient: () => ({ data: null }),
  usePublicClient: () => ({}),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: vi.fn(),
  }),
}));

const { mockGapClient } = vi.hoisted(() => {
  const mockGapClient = {
    findSchema: vi.fn().mockReturnValue("mock-schema"),
    fetch: { slugExists: vi.fn().mockResolvedValue(false) },
    generateSlug: vi.fn().mockResolvedValue("generated-slug"),
  };
  return { mockGapClient };
});

vi.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: {
      network: "optimism",
    },
  }),
  getGapClient: vi.fn().mockReturnValue(mockGapClient),
  __mockGapClient: mockGapClient,
}));

// Mock ensureCorrectChain to bypass chain switching delays and getGapClient issues
vi.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: vi.fn().mockResolvedValue({
    success: true,
    chainId: 10,
    gapClient: mockGapClient,
  }),
}));

const mockShowError = vi.fn();
const mockStartAttestation = vi.fn();
const mockShowLoading = vi.fn();
const mockShowSuccess = vi.fn();
const mockDismiss = vi.fn();
const mockChangeStepperStep = vi.fn();

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showLoading: mockShowLoading,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: mockDismiss,
    changeStepperStep: mockChangeStepperStep,
  }),
}));

// Mock SDK Community class
vi.mock("@show-karma/karma-gap-sdk", () => ({
  Community: vi.fn().mockImplementation(() => ({
    attest: (...args: any[]) => mockAttest(...args),
    chainID: 1,
    uid: "0xmock-uid",
  })),
  nullRef: "0x0000000000000000000000000000000000000000000000000000000000000000",
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue([{}, null]),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: (obj: any) => obj,
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Mock MarkdownEditor
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, ...props }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      {...props}
    />
  ),
}));

// Mock errorManager
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// Mock messages
vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    COMMUNITY_FORM: {
      TITLE: { MIN: "Too short", MAX: "Too long" },
      SLUG: "Slug required",
      IMAGE_URL: "Image URL required",
    },
  },
}));

// Mock indexer
vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: () => "/attestation-listener",
  },
}));

// Mock ui/button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, isLoading, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

// Access the mock hook via import (vitest alias maps @/hooks/useSetupChainAndWallet
// to __mocks__/hooks/useSetupChainAndWallet.ts)
import * as _setupChainModule from "@/hooks/useSetupChainAndWallet";

const mockHookModule = {
  useSetupChainAndWallet: _setupChainModule.useSetupChainAndWallet as unknown as vi.Mock,
};

describe("CommunityDialog", () => {
  const mockRefreshCommunities = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAttest = vi.fn();
    mockSetupChainAndWallet = vi.fn().mockResolvedValue({
      gapClient: {
        findSchema: vi.fn().mockReturnValue("mock-schema"),
        fetch: { slugExists: vi.fn().mockResolvedValue(false) },
        generateSlug: vi.fn().mockResolvedValue("generated-slug"),
      },
      walletSigner: { signMessage: vi.fn() },
      chainId: 10,
    });
    // Reconfigure the hook to return our controllable setupChainAndWallet
    // (clearAllMocks resets mockReturnValue, so we must set it each time)
    mockHookModule.useSetupChainAndWallet.mockReturnValue({
      setupChainAndWallet: (...args: any[]) => mockSetupChainAndWallet(...args),
      isSmartWalletReady: false,
      smartWalletAddress: null,
      hasEmbeddedWallet: false,
      hasExternalWallet: false,
    });
  });

  describe("Form data preservation on transaction failure", () => {
    it("should reopen modal with preserved form data when attestation fails", async () => {
      // Setup: attest rejects (simulating a failed onchain transaction)
      mockAttest.mockRejectedValue(new Error("Transaction rejected by user"));

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);

      // Open modal
      const openButton = screen.getByText("New Community");
      fireEvent.click(openButton);

      // Fill in form data
      const nameInput = screen.getByPlaceholderText('e.g. "My awesome Community"');
      fireEvent.change(nameInput, { target: { value: "Test Community" } });

      const imageInput = screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"');
      fireEvent.change(imageInput, { target: { value: "https://example.com/logo.png" } });

      const slugInput = screen.getByPlaceholderText('e.g. "grant-portal"');
      fireEvent.change(slugInput, { target: { value: "test-community" } });

      // Submit form
      const submitButton = screen.getByText("Create Community");
      fireEvent.click(submitButton);

      // Wait for the error handling to complete and modal to reopen
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("Failed to create community. Please try again.");
      });

      // Modal should be reopened
      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // Form data should be preserved (the inputs should still have their values)
      const preservedNameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      expect(preservedNameInput.value).toBe("Test Community");

      const preservedImageInput = screen.getByPlaceholderText(
        'e.g. "https://example.com/image.jpg"'
      ) as HTMLInputElement;
      expect(preservedImageInput.value).toBe("https://example.com/logo.png");

      const preservedSlugInput = screen.getByPlaceholderText(
        'e.g. "grant-portal"'
      ) as HTMLInputElement;
      expect(preservedSlugInput.value).toBe("test-community");
    });

    it("should show error toast when attestation fails", async () => {
      mockAttest.mockRejectedValue(new Error("Transaction failed"));

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);

      const openButton = screen.getByText("New Community");
      fireEvent.click(openButton);

      // Fill required fields to pass validation
      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("Failed to create community. Please try again.");
      });
    });

    it("should reset form when modal is opened fresh (not from error recovery)", async () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);

      // Open modal
      const openButton = screen.getByText("New Community");
      fireEvent.click(openButton);

      // Fill in data
      const nameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Some Name" } });

      // Close via cancel
      fireEvent.click(screen.getByText("Cancel"));

      // Reopen - should be fresh
      fireEvent.click(openButton);

      const freshNameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      // Default value should be empty string (from dataToUpdate)
      expect(freshNameInput.value).toBe("");
    });
  });

  describe("Modal stays open when setup fails", () => {
    it("should keep modal open when setupChainAndWallet returns null", async () => {
      mockSetupChainAndWallet.mockResolvedValue(null);

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);

      const openButton = screen.getByText("New Community");
      fireEvent.click(openButton);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      // Modal should still be visible since setup failed
      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // Attest should not have been called
      expect(mockAttest).not.toHaveBeenCalled();
    });
  });

  describe("Rendering", () => {
    it("should render trigger button with default text", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.getByText("New Community")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should open dialog when trigger button is clicked", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should display form fields", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      expect(screen.getByPlaceholderText('e.g. "My awesome Community"')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. "grant-portal"')).toBeInTheDocument();
    });

    it("should close dialog when cancel is clicked", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Success flow", () => {
    it("should start attestation when form is submitted with valid data", async () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);

      fireEvent.click(screen.getByText("New Community"));

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test Community" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      // Verify the attestation flow starts (form validation passes and createCommunity runs)
      await waitFor(() => {
        expect(mockStartAttestation).toHaveBeenCalledWith("Creating community...");
      });
    });
  });
});
