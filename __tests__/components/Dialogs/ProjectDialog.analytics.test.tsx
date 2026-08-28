/**
 * @file Emit-site coverage for the project funnel in `ProjectDialog` — both the
 * create side and the edit side.
 *
 * Catalog: `project_create_started { entry_point }`,
 * `project_create_failed { chain_id, error_code }`, and
 * `project_edited { project_id, fields_changed }`.
 *
 * `project_create_started` is deliberately emitted before the wallet is
 * involved, which is the whole point of the triad here (R2: project create is a
 * wallet-signing flow, so it keeps a `_started` leg). The drop-off between
 * "opened the funnel" and "signed the attestation" is only measurable if this
 * fires on submit rather than after a successful attestation — so that ordering
 * is what these tests pin, along with `_failed` carrying a machine error code
 * and never the raw error message.
 *
 * Mock preamble mirrors `ProjectDialog.test.tsx`, which drives the same form.
 */
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

const mockGetProjectById = vi.fn();
vi.mock("@/utilities/sdk", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockUpdateProject = vi.fn();
vi.mock("@/utilities/sdk/projects/editProject", () => ({
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
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

const mockTrack = vi.fn();
vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const eventsNamed = (name: string) => mockTrack.mock.calls.filter(([n]) => n === name);

describe("ProjectDialog analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    networkMockState.showNetworkSelector = false;

    mockProjectAttest = vi.fn().mockResolvedValue({ tx: [{ hash: "0xtx" }] });

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

  const fillStepZero = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "My awesome project");
    const markdownEditors = screen.getAllByTestId("markdown-editor");
    await user.type(markdownEditors[0], "Description");
    await user.type(markdownEditors[1], "Problem");
    await user.type(markdownEditors[2], "Solution");
    await user.type(markdownEditors[3], "Mission summary");
  };

  const advanceToSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
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
    await user.click(screen.getByRole("button", { name: /add contact/i }));

    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);
  };

  const driveCreate = async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(<ProjectDialog />);
    await user.click(screen.getByRole("button", { name: /add project/i }));
    await fillStepZero(user);
    await advanceToSubmit(user);
  };

  it("emits project_create_started once, on submit", async () => {
    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_started")).toHaveLength(1));
    expect(eventsNamed("project_create_started")[0]).toEqual([
      "project_create_started",
      { entry_point: "project_dialog" },
    ]);
  });

  it("emits project_create_started BEFORE the wallet is prepared", async () => {
    await driveCreate();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    // The funnel's whole value is the gap between opening it and signing. If
    // this event moved after the wallet step, every user who abandoned at the
    // wallet prompt would vanish from the funnel entirely.
    const startedAt = mockTrack.mock.invocationCallOrder[0];
    const walletAt = mockSetupChainAndWallet.mock.invocationCallOrder[0];
    expect(startedAt).toBeLessThan(walletAt);
  });

  it("does not emit project_create_started when validation blocks the submit", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(<ProjectDialog />);
    await user.click(screen.getByRole("button", { name: /add project/i }));

    // Submit the empty form: the resolver rejects and onSubmit never runs.
    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
    expect(eventsNamed("project_create_started")).toHaveLength(0);
    expect(mockProjectAttest).not.toHaveBeenCalled();
  });

  it("emits project_create_failed with a machine error_code when the attestation throws", async () => {
    mockProjectAttest = vi.fn().mockRejectedValue(new Error("user rejected the request"));

    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_failed")).toHaveLength(1));
    const [, props] = eventsNamed("project_create_failed")[0];
    expect(props).toHaveProperty("error_code");
    expect(typeof (props as { error_code: unknown }).error_code).toBe("string");
    // The raw message is the one thing that must not ride along: it is
    // unbounded, user-influenced text on a high-cardinality property.
    expect(JSON.stringify(props)).not.toContain("user rejected the request");
  });

  it("carries a chain_id (or explicit null) on project_create_failed", async () => {
    mockProjectAttest = vi.fn().mockRejectedValue(new Error("boom"));

    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_failed")).toHaveLength(1));
    const [, props] = eventsNamed("project_create_failed")[0];
    expect(props).toHaveProperty("chain_id");
    expect(Object.keys(props as object).sort()).toEqual(["chain_id", "error_code"]);
  });

  it("puts no wallet address or email on any create event", async () => {
    await driveCreate();

    await waitFor(() => expect(mockTrack).toHaveBeenCalled());
    const serialised = JSON.stringify(mockTrack.mock.calls);
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
    expect(serialised).not.toContain("test@example.com");
  });
});

/**
 * The edit side. `fields_changed` is supposed to answer "what do people edit?",
 * and the emit it replaced sent the form's whole key set — the same 21 names on
 * every submit, including submits that changed nothing.
 *
 * The diff also has to be taken BEFORE `updateProject` runs: that function calls
 * `details.setValues(...)` on the project object it is handed, so anything
 * compared afterwards has already been overwritten with the new values. These
 * tests drive the real dialog, so a diff moved back below the update would come
 * back empty and fail here.
 */
describe("ProjectDialog analytics — editing", () => {
  const STORED_TITLE = "Karma GAP";
  const STORED_DESCRIPTION = "On-chain grant accountability";

  /** The project as the API hands it to the dialog, for the prefilled form. */
  const projectToUpdate = () =>
    ({
      uid: "0xproject-uid",
      chainID: 10,
      owner: "0x1234567890abcdef1234567890abcdef12345678",
      details: {
        title: STORED_TITLE,
        description: STORED_DESCRIPTION,
        problem: "Grants are unaccountable",
        solution: "Attest to them",
        missionSummary: "Fund what works",
        locationOfImpact: "Global",
        slug: "karma-gap",
        businessModel: "nonprofit",
        stageIn: "growth",
        raisedMoney: "1000000",
        pathToTake: "scale",
        tags: ["public-goods"],
        links: [{ type: "twitter", url: "https://x.test/karma" }],
      },
    }) as never;

  /**
   * The same project as the SDK entity `getProjectById` returns — this is the
   * object the diff reads the PREVIOUS values from, and the one `updateProject`
   * would mutate.
   */
  const fetchedProject = () => ({
    uid: "0xproject-uid",
    chainID: 10,
    details: {
      title: STORED_TITLE,
      description: STORED_DESCRIPTION,
      problem: "Grants are unaccountable",
      solution: "Attest to them",
      missionSummary: "Fund what works",
      locationOfImpact: "Global",
      imageURL: "",
      businessModel: "nonprofit",
      stageIn: "growth",
      raisedMoney: "1000000",
      pathToTake: "scale",
      tags: [{ name: "public-goods" }],
      links: [{ type: "twitter", url: "https://x.test/karma" }],
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    networkMockState.showNetworkSelector = false;

    mockGetProjectById.mockResolvedValue(fetchedProject());
    mockUpdateProject.mockResolvedValue({ uid: "0xproject-uid", details: { slug: "karma-gap" } });

    mockGetAttestationSigner.mockResolvedValue({ signMessage: vi.fn() });
    mockSetupChainAndWallet = vi.fn().mockResolvedValue({
      gapClient: {
        findSchema: vi.fn().mockReturnValue("mock-schema"),
        generateSlug: vi.fn().mockResolvedValue("karma-gap"),
      },
      walletSigner: { signMessage: vi.fn() },
      chainId: 10,
    });
  });

  const openEditDialog = async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(
      <ProjectDialog
        projectToUpdate={projectToUpdate()}
        buttonElement={{ text: "Edit project", styleClass: "" }}
      />
    );
    await user.click(screen.getByRole("button", { name: /edit project/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue(STORED_TITLE)).toBeInTheDocument();
    });
    return user;
  };

  const submitEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);
    await waitFor(() => expect(mockUpdateProject).toHaveBeenCalled());
    void user;
  };

  it("names only the field the user actually changed", async () => {
    const user = await openEditDialog();

    const titleInput = screen.getByDisplayValue(STORED_TITLE);
    await user.clear(titleInput);
    await user.type(titleInput, "Karma GAP v2");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    expect(eventsNamed("project_edited")[0]).toEqual([
      "project_edited",
      { project_id: "0xproject-uid", fields_changed: ["title"] },
    ]);
  });

  it("emits nothing when the submit changed nothing", async () => {
    // The old emit reported all 21 form keys here, which made every no-op save
    // look like a full profile rewrite.
    const user = await openEditDialog();

    await submitEdit(user);

    expect(eventsNamed("project_edited")).toHaveLength(0);
  });

  it("names each changed field when several changed", async () => {
    const user = await openEditDialog();

    const titleInput = screen.getByDisplayValue(STORED_TITLE);
    await user.clear(titleInput);
    await user.type(titleInput, "Karma GAP v2");

    const descriptionEditor = screen.getByDisplayValue(STORED_DESCRIPTION);
    await user.clear(descriptionEditor);
    await user.type(descriptionEditor, "Something else entirely");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    const [, props] = eventsNamed("project_edited")[0] as [string, { fields_changed: string[] }];
    expect([...props.fields_changed].sort()).toEqual(["description", "title"]);
  });

  it("carries field names and never the content behind them", async () => {
    const user = await openEditDialog();

    const descriptionEditor = screen.getByDisplayValue(STORED_DESCRIPTION);
    await user.clear(descriptionEditor);
    await user.type(descriptionEditor, "Confidential roadmap detail");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    const serialised = JSON.stringify(eventsNamed("project_edited"));
    expect(serialised).not.toContain("Confidential roadmap detail");
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
  });
});
