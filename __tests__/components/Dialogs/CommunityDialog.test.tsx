import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";

// Mock Headless UI Dialog components
jest.mock("@headlessui/react", () => {
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

// Mock Heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-mark-icon" {...props} />,
}));

// Track mock attestation behavior
const mockAttest = jest.fn();
const mockFindSchema = jest.fn().mockReturnValue("mock-schema");
const mockSlugExists = jest.fn().mockResolvedValue(false);
const mockGenerateSlug = jest.fn().mockImplementation((slug: string) => slug);

// Mock karma-gap-sdk
jest.mock("@show-karma/karma-gap-sdk", () => ({
  Community: jest.fn().mockImplementation(() => ({
    attest: mockAttest,
    chainID: 1,
    uid: "mock-uid",
  })),
  nullRef: "0x0000000000000000000000000000000000000000000000000000000000000000",
}));

// Mock hooks
const mockStartAttestation = jest.fn();
const mockShowLoading = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockDismiss = jest.fn();
const mockChangeStepperStep = jest.fn();

jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showLoading: mockShowLoading,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: mockDismiss,
    changeStepperStep: mockChangeStepperStep,
  }),
}));

const mockSetupChainAndWallet = jest.fn();

// The moduleNameMapper in jest.config.ts maps @/hooks/useSetupChainAndWallet
// to a mock file, but we need to override it with our test-specific mock.
// We mock the actual file path to bypass the moduleNameMapper.
jest.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    smartWalletAddress: null,
  }),
}));

jest.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: {
      findSchema: mockFindSchema,
      fetch: { slugExists: mockSlugExists },
      generateSlug: mockGenerateSlug,
    },
  }),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: jest.fn(),
  }),
}));

jest.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 1 },
  }),
  useChainId: () => 1,
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([{}, null]),
}));

jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: jest.fn().mockReturnValue("/api/attestation-listener"),
  },
}));

jest.mock("@/utilities/messages", () => ({
  MESSAGES: {
    COMMUNITY_FORM: {
      TITLE: { MIN: "Min 3 chars", MAX: "Max 50 chars" },
      SLUG: "Min 3 chars",
      IMAGE_URL: "Image URL required",
    },
  },
}));

jest.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 1, name: "Ethereum" },
    { id: 10, name: "Optimism" },
  ],
}));

jest.mock("@/utilities/sanitize", () => ({
  sanitizeObject: jest.fn((obj: any) => obj),
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, isLoading, ...props }: any) => (
    <button data-loading={isLoading} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

describe("CommunityDialog", () => {
  const mockRefreshCommunities = jest.fn().mockResolvedValue([]);

  const defaultProps = {
    refreshCommunities: mockRefreshCommunities,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSlugExists.mockResolvedValue(false);
    mockAttest.mockResolvedValue({ tx: [{ hash: "0xabc" }] });
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: {
        findSchema: mockFindSchema,
        fetch: { slugExists: mockSlugExists },
        generateSlug: mockGenerateSlug,
      },
      walletSigner: {},
      chainId: 1,
    });
  });

  describe("Rendering", () => {
    it("should render trigger button with default text", () => {
      render(<CommunityDialog {...defaultProps} />);
      expect(screen.getByText("New Community")).toBeInTheDocument();
    });

    it("should open dialog when trigger button is clicked", () => {
      render(<CommunityDialog {...defaultProps} />);
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create a new Community!")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<CommunityDialog {...defaultProps} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Dialog Opening and Closing", () => {
    it("should close dialog when cancel button is clicked", () => {
      render(<CommunityDialog {...defaultProps} />);

      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should close dialog when X button is clicked", () => {
      render(<CommunityDialog {...defaultProps} />);

      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      const closeButton = screen.getByTestId("x-mark-icon").closest("button")!;
      fireEvent.click(closeButton);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Error Recovery - Disappearing Form Fix", () => {
    it("should reopen modal with form data preserved when attestation fails", async () => {
      mockAttest.mockRejectedValue(new Error("User rejected transaction"));

      render(<CommunityDialog {...defaultProps} />);

      // Open dialog
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      // Fill in form data
      const nameInput = screen.getByPlaceholderText('e.g. "My awesome Community"');
      fireEvent.change(nameInput, { target: { value: "Test Community" } });

      const slugInput = screen.getByPlaceholderText('e.g. "grant-portal"');
      fireEvent.change(slugInput, { target: { value: "test-community" } });

      const imageInput = screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"');
      fireEvent.change(imageInput, { target: { value: "https://example.com/img.png" } });

      // Submit form
      const submitButton = screen.getByText("Create Community");
      fireEvent.click(submitButton);

      // Wait for the error recovery to reopen modal
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("Failed to create community. Please try again.");
      });

      // Modal should be reopened after error
      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(screen.getByPlaceholderText('e.g. "My awesome Community"')).toHaveValue(
        "Test Community"
      );
      expect(screen.getByPlaceholderText('e.g. "grant-portal"')).toHaveValue("test-community");
      expect(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"')).toHaveValue(
        "https://example.com/img.png"
      );
    });

    it("should reopen modal when setupChainAndWallet succeeds but attest fails", async () => {
      mockAttest.mockRejectedValue(new Error("Transaction reverted"));

      render(<CommunityDialog {...defaultProps} />);

      // Open dialog
      fireEvent.click(screen.getByText("New Community"));

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "My Community" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "my-community" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://example.com/logo.png" },
      });

      // Submit
      fireEvent.click(screen.getByText("Create Community"));

      // Wait for error recovery
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled();
      });

      // Modal should be visible again with data preserved
      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });
    });

    it("should reset shouldResetOnOpen flag when user manually closes modal", () => {
      render(<CommunityDialog {...defaultProps} />);

      // Open dialog
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      // Close via cancel
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();

      // Reopen - should show fresh form (shouldResetOnOpen was reset to true)
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should allow user to manually close modal after error recovery reopens it", async () => {
      mockAttest.mockRejectedValue(new Error("Wallet rejected"));

      render(<CommunityDialog {...defaultProps} />);

      // Open dialog and fill data
      fireEvent.click(screen.getByText("New Community"));
      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://example.com/img.png" },
      });

      // Submit (will fail)
      fireEvent.click(screen.getByText("Create Community"));

      // Wait for modal to reopen after error
      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // User should be able to close the modal manually
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should show loading state during form submission", async () => {
      // Make attest hang to test loading state
      mockAttest.mockReturnValue(new Promise(() => {}));

      render(<CommunityDialog {...defaultProps} />);

      fireEvent.click(screen.getByText("New Community"));

      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test Community" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://example.com/img.png" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      // Start attestation toast should be called
      await waitFor(() => {
        expect(mockStartAttestation).toHaveBeenCalledWith("Creating community...");
      });
    });
  });

  describe("Form Validation", () => {
    it("should show validation errors for empty required fields", async () => {
      render(<CommunityDialog {...defaultProps} />);

      fireEvent.click(screen.getByText("New Community"));

      // Submit empty form
      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        // At least one validation error should show
        const errorMessages = screen.getAllByText(/min|required/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
