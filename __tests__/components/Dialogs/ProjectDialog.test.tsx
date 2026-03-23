import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockProjectAttest: jest.Mock;
let mockSetupChainAndWallet: jest.Mock;
const mockStartAttestation = jest.fn();
const mockGetAttestationSigner = jest.fn();
const mockEnsureCorrectChain = jest.fn();

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

  const MockDialog = ({ children, ...props }: any) => (
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

jest.mock("@radix-ui/react-tooltip", () => {
  const Wrapper = ({ children }: any) => <>{children}</>;
  return {
    Provider: Wrapper,
    Root: Wrapper,
    Trigger: Wrapper,
    Portal: Wrapper,
    Content: Wrapper,
    Arrow: Wrapper,
  };
});

jest.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

jest.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 10 },
    isConnected: true,
  }),
  useChainId: () => 10,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    login: jest.fn(),
  }),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: jest.fn(),
  }),
}));

jest.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: { network: "optimism" },
  }),
  getGapClient: jest.fn().mockReturnValue({
    findSchema: jest.fn().mockReturnValue("mock-schema"),
    generateSlug: jest.fn().mockResolvedValue("my-project"),
  }),
}));

jest.mock("@/hooks/useContactInfo", () => ({
  useContactInfo: () => ({
    data: [],
  }),
}));

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    user: {
      linkedAccounts: [{ type: "wallet" }],
    },
  }),
  useWallets: () => ({
    wallets: [
      {
        walletClientType: "injected",
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
    ],
  }),
  useLogin: () => ({
    login: jest.fn(),
  }),
  useLogout: () => ({
    logout: jest.fn(),
  }),
  PrivyProvider: ({ children }: any) => children,
  useCreateWallet: () => ({ createWallet: jest.fn() }),
}));

jest.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: true,
    authenticated: true,
    user: {
      id: "test-user",
      linkedAccounts: [{ type: "wallet" }],
    },
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn().mockResolvedValue(null),
    connectWallet: jest.fn(),
    wallets: [
      {
        walletClientType: "injected",
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
    ],
    smartWalletClient: null,
    isConnected: true,
  }),
  usePrivyBridgeSetter: () => jest.fn(),
  PrivyBridgeProvider: ({ children }: any) => children,
  PRIVY_BRIDGE_DEFAULTS: {},
}));

jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showLoading: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    dismiss: jest.fn(),
    changeStepperStep: jest.fn(),
  }),
}));

jest.mock("@/hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: () => ({
    getAttestationSigner: (...args: any[]) => mockGetAttestationSigner(...args),
    isGaslessAvailable: false,
    attestationAddress: "0x1234567890abcdef1234567890abcdef12345678",
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  }),
}));

jest.mock("hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: () => ({
    getAttestationSigner: (...args: any[]) => mockGetAttestationSigner(...args),
    isGaslessAvailable: false,
    attestationAddress: "0x1234567890abcdef1234567890abcdef12345678",
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  }),
}));

jest.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(),
}));

jest.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(),
}));

jest.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: (...args: any[]) => mockEnsureCorrectChain(...args),
}));

jest.mock("utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: (...args: any[]) => mockEnsureCorrectChain(...args),
}));

jest.mock("@/store", () => ({
  useProjectStore: (selector: any) =>
    selector({
      refreshProject: jest.fn(),
    }),
}));

jest.mock("@/store/owner", () => ({
  useOwnerStore: (selector: any) =>
    selector({
      isOwner: false,
    }),
}));

jest.mock("@/store/modals/projectEdit", () => ({
  useProjectEditModalStore: () => ({
    isProjectEditModalOpen: false,
    setIsProjectEditModalOpen: jest.fn(),
  }),
}));

jest.mock("@/store/modals/similarProjects", () => ({
  useSimilarProjectsModalStore: () => ({
    isSimilarProjectsModalOpen: false,
    openSimilarProjectsModal: jest.fn(),
  }),
}));

jest.mock("@/services/project-search.service", () => ({
  searchProjects: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/services/project.service", () => ({
  checkSlugExists: jest.fn().mockResolvedValue(false),
  getProject: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: jest.fn().mockResolvedValue({ walletClient: {}, error: null }),
}));

jest.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: jest.fn().mockResolvedValue({ signMessage: jest.fn() }),
}));

jest.mock("@/utilities/github", () => ({
  validateGithubInput: jest.fn().mockResolvedValue({ valid: true }),
}));

jest.mock("@/utilities/fetchData", () => jest.fn().mockResolvedValue([{}, null]));

jest.mock("@/utilities/messages", () => ({
  MESSAGES: {
    PROJECT_FORM: {
      TITLE: { MIN: "Title too short", MAX: "Title too long" },
      RECIPIENT: "Invalid recipient",
      SOCIALS: {
        TWITTER: "Invalid twitter handle",
      },
    },
    PROJECT_CREATE_NETWORK: "Please select a network",
    PROJECT: {
      CREATE: {
        ERROR: (title: string) => `Failed to create ${title}`,
        SUCCESS: "Project created successfully",
      },
      UPDATE: {
        ERROR: "Failed to update project",
      },
    },
  },
}));

jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: () => "/attestation-listener",
    SUBSCRIPTION: {
      CREATE: () => "/subscriptions/create",
    },
    PROJECT: {
      LOGOS: {
        PROMOTE_TO_PERMANENT: () => "/logos/promote",
      },
    },
  },
}));

jest.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
}));

jest.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      SCREENS: {
        NEW_GRANT: jest.fn().mockReturnValue("/project/new-grant"),
      },
      OVERVIEW: jest.fn().mockReturnValue("/project/overview"),
    },
  },
}));

jest.mock("@/utilities/socials", () => ({
  SOCIALS: {
    TELEGRAM: "https://t.me/example",
  },
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/utilities/customLink", () => ({
  isCustomLink: jest.fn().mockReturnValue(false),
}));

jest.mock("@/utilities/sanitize", () => ({
  sanitizeObject: (obj: any) => obj,
}));

jest.mock("@/utilities/sdk", () => ({
  getProjectById: jest.fn(),
}));

jest.mock("@/utilities/sdk/projects/editProject", () => ({
  updateProject: jest.fn(),
}));

jest.mock("@/components/Icons", () => ({
  DiscordIcon: (props: any) => <svg data-testid="discord-icon" {...props} />,
  GithubIcon: (props: any) => <svg data-testid="github-icon" {...props} />,
  LinkedInIcon: (props: any) => <svg data-testid="linkedin-icon" {...props} />,
  TwitterIcon: (props: any) => <svg data-testid="twitter-icon" {...props} />,
  WebsiteIcon: (props: any) => <svg data-testid="website-icon" {...props} />,
}));

jest.mock("@/components/Icons/Deck", () => ({
  DeckIcon: (props: any) => <svg data-testid="deck-icon" {...props} />,
}));

jest.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: (props: any) => <svg data-testid="farcaster-icon" {...props} />,
}));

jest.mock("@/components/Icons/Video", () => ({
  VideoIcon: (props: any) => <svg data-testid="video-icon" {...props} />,
}));

jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/components/Utilities/FileUpload", () => ({
  FileUpload: () => <div data-testid="file-upload" />,
}));

jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value || ""}
      placeholder={placeholderText || ""}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, isLoading, disabled, ...props }: any) => (
    <button
      type={props.type || "button"}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/Dialogs/SimilarProjectsDialog", () => ({
  SimilarProjectsDialog: () => <div data-testid="similar-projects-dialog" />,
}));

jest.mock("@/components/Dialogs/ProjectDialog/ContactInfoSection", () => ({
  ContactInfoSection: ({ addContact }: any) => (
    <button
      type="button"
      onClick={() => addContact({ id: "contact-1", type: "email", value: "test@example.com" })}
    >
      Add Contact
    </button>
  ),
}));

jest.mock("@/components/Dialogs/ProjectDialog/NetworkDropdown", () => ({
  NetworkDropdown: ({ onSelectFunction }: any) => (
    <button type="button" onClick={() => onSelectFunction(10)}>
      Select Optimism
    </button>
  ),
}));

jest.mock("@show-karma/karma-gap-sdk", () => ({
  Project: jest.fn().mockImplementation(() => ({
    attest: (...args: any[]) => mockProjectAttest(...args),
    uid: "0xproject-uid",
    chainID: 10,
    recipient: "0x1234567890abcdef1234567890abcdef12345678",
  })),
  ProjectDetails: jest.fn().mockImplementation((args: any) => args),
  MemberOf: jest.fn().mockImplementation((args: any) => args),
  nullRef: "0x0000000000000000000000000000000000000000000000000000000000000000",
}));

describe("ProjectDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockProjectAttest = jest.fn(
      () =>
        new Promise(() => {
          // Keep pending to assert modal state during submission.
        })
    );

    mockGetAttestationSigner.mockResolvedValue({ signMessage: jest.fn() });
    mockEnsureCorrectChain.mockResolvedValue({
      success: true,
      chainId: 10,
      gapClient: {
        findSchema: jest.fn().mockReturnValue("mock-schema"),
        generateSlug: jest.fn().mockResolvedValue("my-project"),
      },
    });

    mockSetupChainAndWallet = jest.fn().mockResolvedValue({
      gapClient: {
        findSchema: jest.fn().mockReturnValue("mock-schema"),
        generateSlug: jest.fn().mockResolvedValue("my-project"),
      },
      walletSigner: { signMessage: jest.fn() },
      chainId: 10,
    });

    const setupHookMockByAlias = jest.requireMock("@/hooks/useSetupChainAndWallet") as {
      useSetupChainAndWallet: jest.Mock;
    };
    setupHookMockByAlias.useSetupChainAndWallet.mockReturnValue({
      setupChainAndWallet: (...args: any[]) => mockSetupChainAndWallet(...args),
      isSmartWalletReady: false,
      smartWalletAddress: null,
      hasEmbeddedWallet: false,
      hasExternalWallet: true,
    });

    const setupHookMockByRoot = jest.requireMock("hooks/useSetupChainAndWallet") as {
      useSetupChainAndWallet: jest.Mock;
    };
    setupHookMockByRoot.useSetupChainAndWallet.mockReturnValue({
      setupChainAndWallet: (...args: any[]) => mockSetupChainAndWallet(...args),
      isSmartWalletReady: false,
      smartWalletAddress: null,
      hasEmbeddedWallet: false,
      hasExternalWallet: true,
    });
  });

  it("keeps the modal open after submit while create attestation is in progress", async () => {
    const { ProjectDialog } = require("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();

    render(<ProjectDialog />);

    await user.click(screen.getByRole("button", { name: /add project/i }));

    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "My awesome project");

    const markdownEditors = screen.getAllByTestId("markdown-editor");
    await user.type(markdownEditors[0], "Description");
    await user.type(markdownEditors[1], "Problem");
    await user.type(markdownEditors[2], "Solution");
    await user.type(markdownEditors[3], "Mission summary");

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your/organization handle")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Describe your business model")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Choose a network to create your project")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /add contact/i }));
    await user.click(screen.getByRole("button", { name: /select optimism/i }));
    await user.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(mockStartAttestation).toHaveBeenCalledWith("Creating project...");
    });

    await waitFor(() => {
      expect(mockProjectAttest).toHaveBeenCalled();
    });

    // Regression assertion: modal should stay open during pending submission.
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });
});
