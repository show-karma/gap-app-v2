/**
 * @file The mock wall the two `ProjectDialog` analytics suites share.
 *
 * `vi.mock` registers against the module graph, and this module is imported
 * before the dialog is, so the factories below are in place by the time the
 * component resolves its own imports. Shared rather than duplicated: this is
 * ~500 lines of preamble mirroring `ProjectDialog.test.tsx`, and two copies of
 * it would drift the moment either suite needed a new mock.
 */

import { createElement, Fragment, type ReactNode } from "react";

type StubProps = Record<string, unknown> & { children?: ReactNode };

/**
 * Every element mock in this file is one of two shapes, so they are built by
 * these two factories rather than declared 20-odd times over.
 *
 * `createElement` rather than JSX, which is what lets this be a `.ts` module.
 * A `.tsx` that declares this many stub components is a React component module
 * as far as tooling is concerned, and gets held to rules meant for real ones —
 * one component per file, components must be exported. Neither is a statement
 * about mocks, and the pair is unsatisfiable together: exporting nothing trips
 * the second, exporting the handles trips the first. Building the stubs from
 * factories means no components are declared here at all.
 */
const stub =
  (tag: string, testId: string) =>
  ({ children, ...rest }: StubProps = {}) =>
    createElement(tag, { "data-testid": testId, ...rest }, children);

/** Renders its children and nothing else — the wrapper mocks. */
const passthrough = ({ children }: StubProps = {}) => createElement(Fragment, null, children);

/** `as`-polymorphic stub: renders whatever tag the caller asked for. */
const polymorphic =
  (fallbackTag: string, omit: readonly string[] = []) =>
  ({ children, as, ...rest }: StubProps & { as?: string } = {}) => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (!omit.includes(key)) props[key] = value;
    }
    return createElement((as as string) || fallbackTag, props, children);
  };

import {
  getNetworkMockState,
  mockEnsureCorrectChain,
  mockGetAttestationSigner,
  mockGetProjectById,
  mockProjectAttest,
  mockSetupChainAndWallet,
  mockStartAttestation,
  mockTrack,
  mockUpdateProject,
} from "./project-dialog-analytics.handles";

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

  const MockDialog = Object.assign(stub("div", "dialog"), {
    Panel: stub("div", "dialog-panel"),
    Title: polymorphic("h3"),
  });

  const MockTransitionRoot = Object.assign(
    ({ show, ...rest }: StubProps & { show?: boolean; as?: string } = {}) =>
      show ? polymorphic("div", TRANSITION_PROPS)(rest) : null,
    { displayName: "Transition", Child: polymorphic("div", TRANSITION_PROPS) }
  );

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

vi.mock("@radix-ui/react-tooltip", () => {
  const Wrapper = passthrough;
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
  PlusIcon: stub("svg", "plus-icon"),
  ChevronRightIcon: stub("svg", "chevron-icon"),
  XMarkIcon: stub("svg", "x-icon"),
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

vi.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
  PROJECT_CREATION_DEFAULT_CHAIN_ID: 8453,
  get SHOW_PROJECT_CREATION_NETWORK_SELECTOR() {
    return getNetworkMockState().showNetworkSelector;
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
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

vi.mock("@/utilities/sdk/projects/editProject", () => ({
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

vi.mock("@/components/Icons", () => ({
  DiscordIcon: stub("svg", "discord-icon"),
  GithubIcon: stub("svg", "github-icon"),
  LinkedInIcon: stub("svg", "linkedin-icon"),
  TwitterIcon: stub("svg", "twitter-icon"),
  WebsiteIcon: stub("svg", "website-icon"),
}));

vi.mock("@/components/Icons/Deck", () => ({
  DeckIcon: stub("svg", "deck-icon"),
}));

vi.mock("@/components/Icons/Farcaster", () => ({
  FarcasterIcon: stub("svg", "farcaster-icon"),
}));

vi.mock("@/components/Icons/Video", () => ({
  VideoIcon: stub("svg", "video-icon"),
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...rest }: StubProps & { href?: string } = {}) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/components/Utilities/FileUpload", () => ({
  FileUpload: stub("div", "file-upload"),
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholderText,
  }: {
    value?: string;
    onChange: (next: string) => void;
    placeholderText?: string;
  }) =>
    createElement("textarea", {
      "data-testid": "markdown-editor",
      "aria-label": "Markdown editor",
      value: value || "",
      placeholder: placeholderText || "",
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    }),
}));

vi.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: stub("div", "skeleton"),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    isLoading,
    disabled,
    ...rest
  }: StubProps & { onClick?: () => void; isLoading?: boolean; disabled?: boolean } = {}) =>
    createElement(
      "button",
      {
        ...rest,
        type: (rest.type as string) || "button",
        onClick,
        disabled: disabled || isLoading,
      },
      children
    ),
}));

vi.mock("@/components/Dialogs/SimilarProjectsDialog", () => ({
  SimilarProjectsDialog: stub("div", "similar-projects-dialog"),
}));

vi.mock("@/components/Dialogs/ProjectDialog/ContactInfoSection", () => ({
  ContactInfoSection: ({ addContact }: { addContact: (contact: unknown) => void }) =>
    createElement(
      "button",
      {
        type: "button",
        onClick: () => addContact({ id: "contact-1", type: "email", value: "test@example.com" }),
      },
      "Add Contact"
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

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
