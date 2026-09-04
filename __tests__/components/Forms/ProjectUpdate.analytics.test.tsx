/**
 * @file Emit-site coverage for `project_update_posted` / `project_update_failed`.
 *
 * Catalog: `project_update_posted { project_id, has_deliverables, word_count }`
 * and `project_update_failed { project_id, error_code }`.
 *
 * Per R2 this flow has no `_started` leg — it is a single-submit form — so the
 * only signals are the two terminal legs, and both need to be right. The posted
 * event is emitted only once the activity is observed in the refetched list,
 * not when the attestation resolves, so a submit that attests but never indexes
 * must not report a post. `word_count` is the property most likely to drift
 * (characters vs words), and `has_deliverables` must be a boolean rather than a
 * count.
 *
 * Mock preamble mirrors `ProjectUpdate.test.tsx`, which drives the same form.
 */
import { ProjectUpdate as MockedProjectUpdate } from "@show-karma/karma-gap-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: mockRefresh,
  }),
  usePathname: () => "/project/test-project/updates/new",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ projectId: "test-project" }),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
    chain: { id: 10 },
  })),
  useChainId: () => 10,
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({
    switchChainAsync: vi.fn(),
  })),
}));

const mockSetupChainAndWalletFn = vi.fn().mockResolvedValue({
  walletSigner: {},
  gapClient: {
    findSchema: vi.fn(() => ({ uid: "schema-1" })),
  },
});
// Mock both the alias path (for test requires) and the relative path
// (the SWC transformer may resolve @/ aliases to relative paths before Jest sees them)
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWalletFn,
  })),
}));

// Also mock via relative path from the test file to the real hooks directory
vi.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWalletFn,
  })),
}));

const mockStartAttestation = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockDismiss = vi.fn();
const mockUpdateStep = vi.fn();
const mockChangeStepperStep = vi.fn();
const mockSetIsStepper = vi.fn();
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: mockStartAttestation,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: mockDismiss,
    updateStep: mockUpdateStep,
    changeStepperStep: mockChangeStepperStep,
    setIsStepper: mockSetIsStepper,
  })),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: vi.fn(() => ({
    gap: {},
  })),
}));

const mockProjectUpdatesData = {
  projectUpdates: [],
};
const mockRefetchUpdates = vi.fn().mockResolvedValue({ data: mockProjectUpdatesData });
vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: vi.fn(() => ({
    rawData: mockProjectUpdatesData,
    refetch: mockRefetchUpdates,
  })),
}));

const mockProjectGrants: any[] = [];
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({
    grants: mockProjectGrants,
  })),
}));

vi.mock("@/hooks/useImpactAnswers", () => ({
  useImpactAnswers: vi.fn(() => ({
    data: [],
  })),
}));

vi.mock("@/hooks/useAutosyncedIndicators", () => ({
  useAutosyncedIndicators: vi.fn(() => ({
    data: [],
  })),
}));

vi.mock("@/hooks/useUnlinkedIndicators", () => ({
  useUnlinkedIndicators: vi.fn(() => ({
    data: [],
  })),
}));

const mockProject = {
  uid: "project-uid-1",
  chainID: 10,
  owner: "0x1234567890123456789012345678901234567890",
  details: {
    title: "Test Project",
    slug: "test-project",
  },
};

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector: (state: any) => any) => selector({ project: mockProject })),
}));

vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: vi.fn(() => ({
    openShareDialog: vi.fn(),
  })),
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: vi.fn((date: any) => "2024-01-01"),
}));

vi.mock("@/utilities/impact", () => ({
  sendImpactAnswers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: vi.fn(() => "/attestation-listener"),
  },
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    PROJECT_UPDATE_FORM: {
      TITLE: {
        MIN: "Title must be at least 3 characters",
        MAX: "Title must be at most 75 characters",
      },
      TEXT: {
        MIN: "Description is required",
        MAX: "This update is too long. Please keep it to 15,000 characters or fewer.",
      },
      SUCCESS: "Activity posted successfully!",
      ERROR: "Failed to post activity",
    },
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      OVERVIEW: (slug: string) => `/project/${slug}`,
      UPDATES: (slug: string) => `/project/${slug}/updates`,
      SCREENS: {
        NEW_GRANT: (slug: string) => `/project/${slug}/new-grant`,
      },
    },
  },
}));

vi.mock("@/utilities/queries/getIndicatorsByCommunity", () => ({
  getIndicatorsByCommunity: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utilities/share/text", () => ({
  SHARE_TEXTS: {
    PROJECT_ACTIVITY: vi.fn(() => "Share text"),
  },
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(" "),
}));

const mockAttest = vi.fn().mockResolvedValue({ tx: [{ hash: "0xabc" }] });
vi.mock("@show-karma/karma-gap-sdk", () => ({
  ProjectUpdate: vi.fn(function (this: any) {
    this.attest = mockAttest;
    this.chainID = 10;
    this.uid = "new-update-uid";
  }),
  IProjectUpdate: {},
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
    type,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    type?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled || isLoading} type={type as any}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

vi.mock("@/components/Utilities/DatePicker", () => ({
  DatePicker: ({ placeholder }: { placeholder: string; [key: string]: any }) => (
    <button data-testid="date-picker">{placeholder}</button>
  ),
}));

vi.mock("@/components/Utilities/InfoTooltip", () => ({
  InfoTooltip: ({ content }: { content: string }) => (
    <span data-testid="info-tooltip" title={content} />
  ),
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholderText,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholderText: string;
    className?: string;
  }) => (
    <textarea
      data-testid="markdown-editor"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholderText}
    />
  ),
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// ProjectUpdate imports OutputsSection from the direct module path (not the
// barrel), so mock that path; keep the barrel mock for any barrel consumers.
vi.mock("@/components/Forms/Outputs/OutputsSection", () => ({
  OutputsSection: ({ labelStyle }: { labelStyle: string; [key: string]: any }) => (
    <div data-testid="outputs-section">Outputs Section</div>
  ),
}));
vi.mock("@/components/Forms/Outputs", () => ({
  OutputsSection: ({ labelStyle }: { labelStyle: string; [key: string]: any }) => (
    <div data-testid="outputs-section">Outputs Section</div>
  ),
}));

// --- Helpers ---

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockTrack = vi.fn();
vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const eventsNamed = (name: string) => mockTrack.mock.calls.filter(([n]) => n === name);

describe("ProjectUpdateForm analytics", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    mockAttest.mockResolvedValue({ tx: [{ hash: "0xabc" }] });
    mockRefetchUpdates.mockResolvedValue({ data: { projectUpdates: [] } });
    mockSetupChainAndWalletFn.mockResolvedValue({
      walletSigner: {},
      gapClient: { findSchema: vi.fn(() => ({ uid: "schema-1" })) },
    });
    vi.mocked(MockedProjectUpdate).mockImplementation(function (this: any) {
      this.attest = mockAttest;
      this.chainID = 10;
      this.uid = "new-update-uid";
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const submitUpdate = async (body: string) => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectUpdateForm />);

    await user.type(
      screen.getByPlaceholderText("Ex: Launched a feature to onboard users"),
      "New Feature Launch"
    );
    await user.type(screen.getByTestId("markdown-editor"), body);
    await user.click(screen.getByText("Post activity"));
  };

  const indexTheUpdate = () =>
    mockRefetchUpdates.mockResolvedValue({
      data: { projectUpdates: [{ uid: "new-update-uid", title: "New Feature Launch" }] },
    });

  it("emits project_update_posted once the activity is indexed", async () => {
    indexTheUpdate();

    await submitUpdate("This is a detailed description of the feature");

    await waitFor(() => expect(eventsNamed("project_update_posted")).toHaveLength(1), {
      timeout: 3000,
    });
    const [, props] = eventsNamed("project_update_posted")[0];
    expect(Object.keys(props as object).sort()).toEqual([
      "has_deliverables",
      "project_id",
      "word_count",
    ]);
  });

  it("counts words, not characters, in word_count", async () => {
    indexTheUpdate();

    // Eight words; a character count would report 45+.
    await submitUpdate("one two three four five six seven eight");

    await waitFor(() => expect(eventsNamed("project_update_posted")).toHaveLength(1), {
      timeout: 3000,
    });
    const [, props] = eventsNamed("project_update_posted")[0];
    expect((props as { word_count: number }).word_count).toBe(8);
  });

  it("reports has_deliverables as a boolean, not a count", async () => {
    indexTheUpdate();

    await submitUpdate("A body with no deliverables attached");

    await waitFor(() => expect(eventsNamed("project_update_posted")).toHaveLength(1), {
      timeout: 3000,
    });
    const [, props] = eventsNamed("project_update_posted")[0];
    expect((props as { has_deliverables: unknown }).has_deliverables).toBe(false);
  });

  it("never puts the activity body or title on the event", async () => {
    indexTheUpdate();

    await submitUpdate("commercially sensitive roadmap detail");

    await waitFor(() => expect(eventsNamed("project_update_posted")).toHaveLength(1), {
      timeout: 3000,
    });
    const serialised = JSON.stringify(eventsNamed("project_update_posted")[0]);
    expect(serialised).not.toContain("commercially sensitive roadmap detail");
    expect(serialised).not.toContain("New Feature Launch");
  });

  it("emits no posted event when the wallet cannot be prepared", async () => {
    mockSetupChainAndWalletFn.mockResolvedValue(null);

    await submitUpdate("This never reaches the chain");

    await waitFor(() => expect(mockSetupChainAndWalletFn).toHaveBeenCalled());
    expect(eventsNamed("project_update_posted")).toHaveLength(0);
  });

  it("emits project_update_failed with a machine code, never the raw message", async () => {
    mockAttest.mockRejectedValue(new Error("user rejected the request"));

    await submitUpdate("This attestation blows up");

    await waitFor(() => expect(eventsNamed("project_update_failed")).toHaveLength(1), {
      timeout: 3000,
    });
    const [, props] = eventsNamed("project_update_failed")[0];
    expect(Object.keys(props as object).sort()).toEqual(["error_code", "project_id"]);
    expect(JSON.stringify(props)).not.toContain("user rejected the request");
  });
});
