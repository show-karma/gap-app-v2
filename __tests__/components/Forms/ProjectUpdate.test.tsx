import { ProjectUpdate as MockedProjectUpdate } from "@show-karma/karma-gap-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { useImpactAnswers } from "@/hooks/useImpactAnswers";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";

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

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue([{}, null]),
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
      TEXT: "Description is required",
      SUCCESS: "Activity posted successfully!",
      ERROR: "Failed to post activity",
    },
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
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
  ProjectUpdate: vi.fn().mockImplementation(() => ({
    attest: mockAttest,
    chainID: 10,
    uid: "new-update-uid",
  })),
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

// --- Tests ---

describe("ProjectUpdateForm", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    // Restore mocks that vi.clearAllMocks() wipes; the module-level declarations
    // only set the resolved value once — clearAllMocks removes implementations too.
    mockAttest.mockResolvedValue({ tx: [{ hash: "0xabc" }] });
    mockRefetchUpdates.mockResolvedValue({ data: { projectUpdates: [] } });
    mockSetupChainAndWalletFn.mockResolvedValue({
      walletSigner: {},
      gapClient: {
        findSchema: vi.fn(() => ({ uid: "schema-1" })),
      },
    });
    // Restore ProjectUpdate constructor mock implementation
    vi.mocked(MockedProjectUpdate).mockImplementation(
      () => ({ attest: mockAttest, chainID: 10, uid: "new-update-uid" }) as any
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("rendering", () => {
    it("renders with project data", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.getByText("Activity Name *")).toBeInTheDocument();
      expect(screen.getByText("Description *")).toBeInTheDocument();
    });

    it("renders title input field", () => {
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      expect(titleInput).toBeInTheDocument();
    });

    it("renders markdown editor for description", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    });

    it("renders date picker fields", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.getByText("Activity Start date (Optional)")).toBeInTheDocument();
      expect(screen.getByText("Activity End date (Optional)")).toBeInTheDocument();
    });

    it("renders outputs section", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.getByTestId("outputs-section")).toBeInTheDocument();
    });

    it("renders Post activity button", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.getByText("Post activity")).toBeInTheDocument();
    });
  });

  describe("grants dropdown", () => {
    it("does not render grants dropdown when no grants exist", () => {
      renderWithProviders(<ProjectUpdateForm />);

      expect(screen.queryByText(/which grants helped you accomplish/)).not.toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("disables submit button when form is invalid (empty)", () => {
      renderWithProviders(<ProjectUpdateForm />);

      const submitButton = screen.getByText("Post activity");
      expect(submitButton).toBeDisabled();
    });

    it("shows title validation error for short title", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Title must be at least 3 characters")).toBeInTheDocument();
      });
    });

    it("clears title validation error when valid title is entered", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Title must be at least 3 characters")).toBeInTheDocument();
      });

      await user.clear(titleInput);
      await user.type(titleInput, "Valid Title Here");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Title must be at least 3 characters")).not.toBeInTheDocument();
      });
    });
  });

  describe("form interactions", () => {
    it("allows entering a title", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "New Feature Launch");
      expect(titleInput).toHaveValue("New Feature Launch");
    });

    it("allows entering description via markdown editor", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const editor = screen.getByTestId("markdown-editor");
      await user.type(editor, "This is a detailed description");
      expect(editor).toHaveValue("This is a detailed description");
    });
  });

  describe("duplicate title warning", () => {
    it("shows error when title matches existing update", async () => {
      // Mock existing updates

      (useProjectUpdates as vi.Mock).mockReturnValue({
        rawData: {
          projectUpdates: [{ uid: "update-1", title: "Existing Activity" }],
        },
        refetch: mockRefetchUpdates,
      });

      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "Existing Activity");

      await waitFor(() => {
        expect(
          screen.getByText("You already have an activity with this title.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("indicator data and OutputsSection", () => {
    it("passes indicator data to OutputsSection when indicators exist", () => {
      (useImpactAnswers as vi.Mock).mockReturnValue({
        data: [
          {
            id: "indicator-1",
            name: "Users Onboarded",
            description: "Number of users",
            unitOfMeasure: "count",
            communityId: "community-1",
            datapoints: [{ value: 100, proof: "https://proof.example.com" }],
          },
        ],
      });

      renderWithProviders(<ProjectUpdateForm />);

      // OutputsSection mock should be rendered with the data
      expect(screen.getByTestId("outputs-section")).toBeInTheDocument();
    });
  });

  describe("form submission flow", () => {
    it("calls startAttestation on valid submit", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      // Fill title
      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "New Feature Launch");

      // Fill description
      const editor = screen.getByTestId("markdown-editor");
      await user.type(editor, "This is a detailed description of the feature");

      // Submit the form
      const submitButton = screen.getByText("Post activity");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockStartAttestation).toHaveBeenCalledWith("Posting activity...");
      });
    });

    it("calls showError when setupChainAndWallet fails", async () => {
      mockSetupChainAndWalletFn.mockRejectedValueOnce(new Error("Wallet error"));

      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "New Feature Launch");

      const editor = screen.getByTestId("markdown-editor");
      await user.type(editor, "This is a detailed description of the feature");

      const submitButton = screen.getByText("Post activity");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("Failed to post activity");
      });
    });

    it("calls showSuccess after successful attestation", async () => {
      // Module-level mockSetupChainAndWalletFn already resolves with valid setup

      // Mock refetch to return the new update
      mockRefetchUpdates.mockResolvedValue({
        data: {
          projectUpdates: [{ uid: "new-update-uid", title: "New Feature Launch" }],
        },
      });

      const user = userEvent.setup();
      renderWithProviders(<ProjectUpdateForm />);

      const titleInput = screen.getByPlaceholderText("Ex: Launched a feature to onboard users");
      await user.type(titleInput, "New Feature Launch");

      const editor = screen.getByTestId("markdown-editor");
      await user.type(editor, "This is a detailed description of the feature");

      const submitButton = screen.getByText("Post activity");
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(mockShowSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("edit mode", () => {
    it("shows Update activity button when editId is provided", () => {
      (useProjectUpdates as vi.Mock).mockReturnValue({
        rawData: {
          projectUpdates: [
            {
              uid: "update-to-edit",
              title: "Edit Me",
              description: "Old description",
              associations: { funding: [], deliverables: [], indicators: [] },
            },
          ],
        },
        refetch: mockRefetchUpdates,
      });

      renderWithProviders(<ProjectUpdateForm editId="update-to-edit" />);

      expect(screen.getByText("Update activity")).toBeInTheDocument();
    });

    it("hides title field in edit mode", () => {
      (useProjectUpdates as vi.Mock).mockReturnValue({
        rawData: {
          projectUpdates: [
            {
              uid: "update-to-edit",
              title: "Edit Me",
              description: "Old description",
              associations: { funding: [], deliverables: [], indicators: [] },
            },
          ],
        },
        refetch: mockRefetchUpdates,
      });

      renderWithProviders(<ProjectUpdateForm editId="update-to-edit" />);

      expect(screen.queryByText("Activity Name *")).not.toBeInTheDocument();
    });
  });
});
