import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockProjectAttest: vi.Mock;
let mockSetupChainAndWallet: vi.Mock;
const mockStartAttestation = vi.fn();
const mockGetAttestationSigner = vi.fn();
const mockEnsureCorrectChain = vi.fn();

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

vi.mock("@radix-ui/react-tooltip", () => {
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

vi.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 10 },
    isConnected: true,
  }),
  useChainId: () => 10,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    login: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: { network: "optimism" },
  }),
  getGapClient: vi.fn().mockReturnValue({
    findSchema: vi.fn().mockReturnValue("mock-schema"),
    generateSlug: vi.fn().mockResolvedValue("my-project"),
  }),
}));

vi.mock("@/hooks/useContactInfo", () => ({
  useContactInfo: () => ({
    data: [],
  }),
}));

vi.mock("@privy-io/react-auth", () => ({
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
    login: vi.fn(),
  }),
  useLogout: () => ({
    logout: vi.fn(),
  }),
  PrivyProvider: ({ children }: any) => children,
  useCreateWallet: () => ({ createWallet: vi.fn() }),
}));

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: true,
    authenticated: true,
    user: {
      id: "test-user",
      linkedAccounts: [{ type: "wallet" }],
    },
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getAccessToken: vi.fn().mockResolvedValue(null),
    connectWallet: vi.fn(),
    wallets: [
      {
        walletClientType: "injected",
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
    ],
    smartWalletClient: null,
    isConnected: true,
  }),
  usePrivyBridgeSetter: () => vi.fn(),
  PrivyBridgeProvider: ({ children }: any) => children,
  PRIVY_BRIDGE_DEFAULTS: {},
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dismiss: vi.fn(),
    changeStepperStep: vi.fn(),
  }),
}));

vi.mock("@/hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: () => ({
    getAttestationSigner: (...args: any[]) => mockGetAttestationSigner(...args),
    isGaslessAvailable: false,
    attestationAddress: "0x1234567890abcdef1234567890abcdef12345678",
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    signerStatus: "ready",
  }),
}));

vi.mock("hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: () => ({
    getAttestationSigner: (...args: any[]) => mockGetAttestationSigner(...args),
    isGaslessAvailable: false,
    attestationAddress: "0x1234567890abcdef1234567890abcdef12345678",
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    signerStatus: "ready",
  }),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: (...args: any[]) => mockSetupChainAndWallet(...args),
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    signerStatus: "ready",
  }),
}));

vi.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: (...args: any[]) => mockSetupChainAndWallet(...args),
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    signerStatus: "ready",
  }),
}));

vi.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: (...args: any[]) => mockEnsureCorrectChain(...args),
}));

vi.mock("utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: (...args: any[]) => mockEnsureCorrectChain(...args),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: any) =>
    selector({
      refreshProject: vi.fn(),
    }),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: (selector: any) =>
    selector({
      isOwner: false,
    }),
}));

vi.mock("@/store/modals/projectEdit", () => ({
  useProjectEditModalStore: () => ({
    isProjectEditModalOpen: false,
    setIsProjectEditModalOpen: vi.fn(),
  }),
}));

vi.mock("@/store/modals/similarProjects", () => ({
  useSimilarProjectsModalStore: () => ({
    isSimilarProjectsModalOpen: false,
    openSimilarProjectsModal: vi.fn(),
  }),
}));

vi.mock("@/services/project-search.service", () => ({
  searchProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/project.service", () => ({
  checkSlugExists: vi.fn().mockResolvedValue(false),
  getProject: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: vi.fn().mockResolvedValue({ walletClient: {}, error: null }),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: vi.fn().mockResolvedValue({ signMessage: vi.fn() }),
}));

vi.mock("@/utilities/github", () => ({
  validateGithubInput: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    PROJECT_FORM: {
      TITLE: { MIN: "Title too short", MAX: "Title too long" },
      DETAILS_MAX: "Your details are too long combined. Keep them under 15,000 characters.",
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

vi.mock("@/utilities/indexer", () => ({
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

// Mutable holder so individual tests can flip the network-selector flag to
// simulate production (hidden) vs staging (shown). Read via a getter below so
// the live import binding reflects mutations made inside a test.
const networkMockState = vi.hoisted(() => ({ showNetworkSelector: false }));

vi.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
  PROJECT_CREATION_DEFAULT_CHAIN_ID: 8453,
  get SHOW_PROJECT_CREATION_NETWORK_SELECTOR() {
    return networkMockState.showNetworkSelector;
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      SCREENS: {
        NEW_GRANT: vi.fn().mockReturnValue("/project/new-grant"),
      },
      OVERVIEW: vi.fn().mockReturnValue("/project/overview"),
    },
  },
}));

vi.mock("@/utilities/socials", () => ({
  SOCIALS: {
    TELEGRAM: "https://t.me/example",
  },
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/utilities/customLink", () => ({
  isCustomLink: vi.fn().mockReturnValue(false),
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: (obj: any) => obj,
}));

vi.mock("@/utilities/sdk", () => ({
  getProjectById: vi.fn(),
}));

vi.mock("@/utilities/sdk/projects/editProject", () => ({
  updateProject: vi.fn(),
}));

vi.mock("@/components/Icons", () => ({
  DiscordIcon: (props: any) => <svg data-testid="discord-icon" {...props} />,
  GithubIcon: (props: any) => <svg data-testid="github-icon" {...props} />,
  LinkedInIcon: (props: any) => <svg data-testid="linkedin-icon" {...props} />,
  TwitterIcon: (props: any) => <svg data-testid="twitter-icon" {...props} />,
  WebsiteIcon: (props: any) => <svg data-testid="website-icon" {...props} />,
}));

vi.mock("@/components/Icons/Deck", () => ({
  DeckIcon: (props: any) => <svg data-testid="deck-icon" {...props} />,
}));

vi.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: (props: any) => <svg data-testid="farcaster-icon" {...props} />,
}));

vi.mock("@/components/Icons/Video", () => ({
  VideoIcon: (props: any) => <svg data-testid="video-icon" {...props} />,
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/components/Utilities/FileUpload", () => ({
  FileUpload: () => <div data-testid="file-upload" />,
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value || ""}
      placeholder={placeholderText || ""}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/ui/button", () => ({
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

vi.mock("@/components/Dialogs/SimilarProjectsDialog", () => ({
  SimilarProjectsDialog: () => <div data-testid="similar-projects-dialog" />,
}));

vi.mock("@/components/Dialogs/ProjectDialog/ContactInfoSection", () => ({
  ContactInfoSection: ({ addContact }: any) => (
    <button
      type="button"
      onClick={() => addContact({ id: "contact-1", type: "email", value: "test@example.com" })}
    >
      Add Contact
    </button>
  ),
}));

class mockProjectClass {
  attest = (...args: any[]) => mockProjectAttest(...args);
  uid = "0xproject-uid";
  chainID = 10;
  recipient = "0x1234567890abcdef1234567890abcdef12345678";
}

vi.mock("@show-karma/karma-gap-sdk", () => ({
  Project: mockProjectClass,
  ProjectDetails: class mockProjectDetailsClass {},
  MemberOf: class mockMemberOfClass {},
  nullRef: "0x0000000000000000000000000000000000000000000000000000000000000000",
}));

describe("ProjectDialog", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Default to production behavior (no network selector) unless a test opts in.
    networkMockState.showNetworkSelector = false;

    mockProjectAttest = vi.fn(
      () =>
        new Promise(() => {
          // Keep pending to assert modal state during submission.
        })
    );

    mockGetAttestationSigner.mockResolvedValue({ signMessage: vi.fn() });
    mockEnsureCorrectChain.mockResolvedValue({
      success: true,
      chainId: 10,
      gapClient: {
        findSchema: vi.fn().mockReturnValue("mock-schema"),
        generateSlug: vi.fn().mockResolvedValue("my-project"),
      },
    });

    mockSetupChainAndWallet = vi.fn().mockResolvedValue({
      gapClient: {
        findSchema: vi.fn().mockReturnValue("mock-schema"),
        generateSlug: vi.fn().mockResolvedValue("my-project"),
      },
      walletSigner: { signMessage: vi.fn() },
      chainId: 10,
    });
  });

  it("keeps the modal open after submit while create attestation is in progress", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
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
      expect(screen.getByRole("button", { name: /add contact/i })).toBeInTheDocument();
    });

    // No network selection step — chainID defaults to Base. Adding a contact is
    // the only remaining requirement to enable submission.
    await user.click(screen.getByRole("button", { name: /add contact/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create project/i })).not.toBeDisabled();
    });
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

  // ---------------------------------------------------------------------------
  // Validation-FAILURE regression tests (Sentry GAP-FRONTEND-221, 223, 224).
  //
  // These would have caught the bug where `zodResolver` re-threw the ZodError
  // as an unhandled promise rejection instead of returning field errors: when
  // the resolver throws, the validation message never renders and the submit
  // handler is never reached. Each test below drives the REAL resolver against
  // invalid input and asserts the error text renders in the DOM AND that the
  // create/attest side effect was never invoked. The global setup additionally
  // fails any test that produces an unhandled promise rejection.
  //
  // Note: the `@/utilities/messages` mock above redefines TITLE.MIN/MAX, so the
  // title messages are asserted against those mocked strings. All other field
  // messages ("Network is required", "Description is required", etc.) are
  // hardcoded in `projectSchema`, so they render verbatim.
  // ---------------------------------------------------------------------------

  const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /add project/i }));
  };

  const submitForm = () => {
    // The submit/next buttons are disabled while validation fails, so submit the
    // <form> directly to exercise handleSubmit(onSubmit) -> the real resolver.
    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);
  };

  it("renders required-field validation errors when submitting an empty form and does not attest", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();

    render(<ProjectDialog />);
    await openDialog(user);

    // Step 0 (General info) is shown first; submit it untouched so the resolver
    // runs against the empty schema.
    submitForm();

    // The step-0 required-field messages must render (resolver returned errors
    // rather than throwing them).
    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Problem is required")).toBeInTheDocument();
    expect(screen.getByText("Solution is required")).toBeInTheDocument();
    expect(screen.getByText("Mission Summary is required")).toBeInTheDocument();
    // TITLE.MIN comes from the mocked MESSAGES.PROJECT_FORM.TITLE above.
    expect(screen.getByText("Title too short")).toBeInTheDocument();

    // The create/attest side effect must NOT fire on a failed validation.
    expect(mockProjectAttest).not.toHaveBeenCalled();
    expect(mockStartAttestation).not.toHaveBeenCalled();
  });

  it("renders the title length error when the title is too short and does not attest", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();

    render(<ProjectDialog />);
    await openDialog(user);

    // "ab" is below the 3-char minimum.
    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "ab");
    submitForm();

    // TITLE.MIN message (mocked) renders; resolver returned the error.
    expect(await screen.findByText("Title too short")).toBeInTheDocument();
    expect(mockProjectAttest).not.toHaveBeenCalled();
    expect(mockStartAttestation).not.toHaveBeenCalled();
  });

  it("defaults to the Base network without a selector and never surfaces a network error", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();

    render(<ProjectDialog />);
    await openDialog(user);

    // Fill all step-0 required fields with valid values so navigation can proceed.
    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "My awesome project");
    const markdownEditors = screen.getAllByTestId("markdown-editor");
    await user.type(markdownEditors[0], "Description");
    await user.type(markdownEditors[1], "Problem");
    await user.type(markdownEditors[2], "Solution");
    await user.type(markdownEditors[3], "Mission summary");

    // Advance through steps 0 -> 1 -> 2 -> 3 (Contact info).
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
      expect(screen.getByRole("button", { name: /add contact/i })).toBeInTheDocument();
    });

    // No network selector or network note is rendered — chainID is pre-set to Base.
    expect(screen.queryByText("Choose a network to create your project")).not.toBeInTheDocument();
    expect(screen.queryByText(/created on the Base network/i)).not.toBeInTheDocument();

    // Add a contact and submit: validation passes with the default chain, so the
    // "Network is required" error must never appear.
    await user.click(screen.getByRole("button", { name: /add contact/i }));
    submitForm();

    await waitFor(() => {
      expect(mockStartAttestation).toHaveBeenCalledWith("Creating project...");
    });

    // The critical contract: creation targets the Base default chain (8453),
    // not the connected wallet chain (mocked to Optimism / 10 above).
    await waitFor(() => {
      expect(mockSetupChainAndWallet).toHaveBeenCalledWith(
        expect.objectContaining({ targetChainId: 8453 })
      );
    });
    expect(screen.queryByText("Network is required")).not.toBeInTheDocument();
  });

  it("shows the network selector on staging and creates on the chosen network", async () => {
    // Staging keeps the network list so projects can be created on other chains.
    networkMockState.showNetworkSelector = true;

    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();

    render(<ProjectDialog />);
    await openDialog(user);

    // Fill all step-0 required fields with valid values so navigation can proceed.
    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "My awesome project");
    const markdownEditors = screen.getAllByTestId("markdown-editor");
    await user.type(markdownEditors[0], "Description");
    await user.type(markdownEditors[1], "Problem");
    await user.type(markdownEditors[2], "Solution");
    await user.type(markdownEditors[3], "Mission summary");

    // Advance through steps 0 -> 1 -> 2 -> 3 (Contact info).
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
      expect(screen.getByRole("button", { name: /add contact/i })).toBeInTheDocument();
    });

    // The network selector renders with the gap-supported networks.
    const networkSelect = screen.getByLabelText("Network *");
    expect(networkSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Optimism" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Arbitrum" })).toBeInTheDocument();

    // Pick Arbitrum (42161) instead of the Base default.
    await user.selectOptions(networkSelect, "42161");

    await user.click(screen.getByRole("button", { name: /add contact/i }));
    submitForm();

    await waitFor(() => {
      expect(mockStartAttestation).toHaveBeenCalledWith("Creating project...");
    });

    // Creation targets the selected chain (Arbitrum / 42161), not the Base default.
    await waitFor(() => {
      expect(mockSetupChainAndWallet).toHaveBeenCalledWith(
        expect.objectContaining({ targetChainId: 42161 })
      );
    });
    expect(screen.queryByText("Network is required")).not.toBeInTheDocument();
  });
});
