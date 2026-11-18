/**
 * @file "Created a Project activity: the confetti showed, the list didn't."
 *
 * The profile page reads its activity feed through ProjectProfileLayout, keyed
 * by the URL slug and observed with `staleTime: "static"` (DEV-612), which
 * `invalidateQueries` skips. The form polls a uid-keyed copy of the feed until
 * the new activity is indexed; that fresh payload has to land in the slug-keyed
 * feed the page shows, before the success state.
 *
 * Mock preamble mirrors `ProjectUpdate.analytics.test.tsx`, which drives the same form.
 */
import { ProjectUpdate as MockedProjectUpdate } from "@show-karma/karma-gap-sdk";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

// --- Helpers ---

const updatesKey = (id: string) =>
  ["project-updates", id, null, null, null, null, null, null] as const;

const feed = (titles: string[], uids: string[]): UpdatesApiResponse =>
  ({
    projectUpdates: titles.map((title, i) => ({ uid: uids[i], title })),
    projectMilestones: [],
    grantMilestones: [],
    grantUpdates: [],
  }) as unknown as UpdatesApiResponse;

describe("ProjectUpdateForm — the profile feed shows the new activity without a reload", () => {
  let queryClient: QueryClient;
  let unsubscribe: () => void = () => {};

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
    });
    mockAttest.mockResolvedValue({ tx: [{ hash: "0xabc" }] });
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
    unsubscribe();
    queryClient.clear();
  });

  it.each([
    ["slug", "test-project"],
    ["uid", "PROJECT-UID-1"],
  ])("updates the static feed keyed by %s", async (_label, pageId) => {
    // What the layout holds: the project (lets a uid be resolved to its slug)
    // and the hydrated feed, observed statically under the page's identifier.
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(pageId), mockProject);
    queryClient.setQueryData(updatesKey(pageId), feed(["Older"], ["old-uid"]));
    const pageFeed = new QueryObserver<UpdatesApiResponse>(queryClient, {
      queryKey: updatesKey(pageId),
      queryFn: async () => {
        throw new Error("the page's own feed must not need a network round-trip");
      },
      staleTime: PRERENDER_SAFE_STALE_TIME,
    });
    unsubscribe = pageFeed.subscribe(() => {});

    // The form's polling read, once indexing has caught up.
    mockRefetchUpdates.mockResolvedValue({
      data: feed(["New Feature Launch", "Older"], ["new-update-uid", "old-uid"]),
    });

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectUpdateForm />
      </QueryClientProvider>
    );
    await user.type(
      screen.getByPlaceholderText("Ex: Launched a feature to onboard users"),
      "New Feature Launch"
    );
    await user.type(screen.getByTestId("markdown-editor"), "A detailed description");
    await user.click(screen.getByText("Post activity"));

    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled(), { timeout: 3000 });
    // By the time the success state shows, the list the page renders has it.
    expect(pageFeed.getCurrentResult().data?.projectUpdates.map((u) => u.title)).toEqual([
      "New Feature Launch",
      "Older",
    ]);
  });
});
