import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/funding-map/add",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
    chain: { id: 10 },
  })),
  useChainId: () => 10,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    ready: true,
    authenticated: true,
    login: vi.fn(),
  })),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({
    switchChainAsync: vi.fn(),
  })),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: vi.fn().mockResolvedValue({
      walletSigner: {},
      gapClient: {},
    }),
  })),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
    startAttestation: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  })),
}));

vi.mock("@/services/communities.service", () => ({
  getCommunities: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/programRegistry.service", () => ({
  ProgramRegistryService: {
    updateProgram: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue([{}, null]),
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    REGISTRY: {
      FORM: {
        NAME: {
          MIN: "Name must be at least 3 characters",
          MAX: "Name must be at most 50 characters",
        },
        DESCRIPTION: "Description is required",
      },
    },
    PROGRAM_REGISTRY: {
      CREATE: {
        ERROR: (name: string) => `Failed to create program ${name}`,
      },
      EDIT: {
        ERROR: (name: string) => `Failed to edit program ${name}`,
      },
    },
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    REGISTRY: {
      ROOT: "/funding-map",
    },
  },
}));

vi.mock("@/utilities/regexs/urlRegex", () => ({
  urlRegex: /^https?:\/\/.+/,
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
}));

vi.mock("@/utilities/chainImgDictionary", () => ({
  chainImgDictionary: vi.fn(() => "/chain.png"),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    REGISTRY: {
      V2: {
        CREATE: "/v2/registry/create",
      },
    },
  },
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((obj: unknown) => obj),
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(" "),
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

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/components/Utilities/DateTimePicker", () => ({
  DateTimePicker: ({ placeholder }: { placeholder: string; [key: string]: any }) => (
    <button data-testid="date-picker">{placeholder}</button>
  ),
}));

vi.mock("@/components/Utilities/MultiEmailInput", () => ({
  MultiEmailInput: ({ placeholder }: { placeholder: string; [key: string]: any }) => (
    <input placeholder={placeholder} data-testid="multi-email-input" />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    id: string;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/CommunitiesSelect", () => ({
  CommunitiesSelect: () => <div data-testid="communities-select" />,
}));

vi.mock("@/components/Pages/ProgramRegistry/SearchDropdown", () => ({
  SearchDropdown: ({
    type,
    selected,
    list,
  }: {
    type: string;
    selected: string[];
    list: string[];
    [key: string]: any;
  }) => <div data-testid={`search-dropdown-${type.toLowerCase()}`}>{selected.length} selected</div>,
}));

vi.mock("@/components/Pages/ProgramRegistry/StatusDropdown", () => ({
  StatusDropdown: () => <div data-testid="status-dropdown" />,
}));

vi.mock("@/components/Pages/ProgramRegistry/helper", () => ({
  registryHelper: {
    categories: ["DeFi", "NFT", "Gaming"],
    ecosystems: ["Ethereum", "Optimism"],
    organizations: ["Org1"],
    networks: ["Mainnet"],
    grantTypes: ["Grant", "Bounty"],
    platformsUsed: ["Gitcoin"],
    status: ["Active", "Inactive"],
    supportedNetworks: 10,
  },
}));

vi.mock("@/components/Icons", () => ({
  Telegram2Icon: () => <span>TG</span>,
  WebsiteIcon: () => <span>WEB</span>,
}));

vi.mock("@/components/Icons/Blog", () => ({
  BlogIcon: () => <span>BLOG</span>,
}));

vi.mock("@/components/Icons/Discord2", () => ({
  Discord2Icon: () => <span>DISC</span>,
}));

vi.mock("@/components/Icons/Discussion", () => ({
  DiscussionIcon: () => <span>FORUM</span>,
}));

vi.mock("@/components/Icons/Organization", () => ({
  OrganizationIcon: () => <span>ORG</span>,
}));

vi.mock("@/components/Icons/Twitter2", () => ({
  Twitter2Icon: () => <span>TW</span>,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

describe("AddProgram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the create program heading when no programToEdit", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.getByText("Add your program to onchain registry")).toBeInTheDocument();
    });

    it("renders update heading when programToEdit is provided", () => {
      renderWithProviders(
        <AddProgram
          programToEdit={
            {
              programId: "p1",
              metadata: { title: "My Program" },
            } as any
          }
          backTo={vi.fn()}
        />
      );
      expect(screen.getByText("Update My Program program")).toBeInTheDocument();
    });

    it("renders all required form fields", () => {
      renderWithProviders(<AddProgram />);

      expect(screen.getByLabelText("Program name *")).toBeInTheDocument();
      expect(screen.getByLabelText("Program website *")).toBeInTheDocument();
      // Description uses textarea without matching id, find by label text
      expect(screen.getByText("Description *")).toBeInTheDocument();
    });

    it("renders optional fields", () => {
      renderWithProviders(<AddProgram />);

      expect(screen.getByText("Start date")).toBeInTheDocument();
      expect(screen.getByText("End date")).toBeInTheDocument();
      expect(screen.getByLabelText("One-line Description")).toBeInTheDocument();
      expect(screen.getByLabelText("Program budget")).toBeInTheDocument();
      expect(screen.getByLabelText("Amount distributed to date")).toBeInTheDocument();
      expect(screen.getByLabelText("Grants issued to date")).toBeInTheDocument();
      expect(screen.getByLabelText("Min Grant size")).toBeInTheDocument();
      expect(screen.getByLabelText("Max Grant size")).toBeInTheDocument();
    });

    it("renders social link fields", () => {
      renderWithProviders(<AddProgram />);

      expect(screen.getByLabelText("X/Twitter")).toBeInTheDocument();
      expect(screen.getByLabelText("Discord")).toBeInTheDocument();
      expect(screen.getByLabelText("Blog")).toBeInTheDocument();
      expect(screen.getByLabelText("Forum")).toBeInTheDocument();
      expect(screen.getByLabelText("Organization website")).toBeInTheDocument();
      expect(screen.getByLabelText("Link to Bug bounty")).toBeInTheDocument();
      expect(screen.getByLabelText("Telegram")).toBeInTheDocument();
      expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
      expect(screen.getByLabelText("Instagram")).toBeInTheDocument();
    });

    it("renders category dropdowns", () => {
      renderWithProviders(<AddProgram />);

      expect(screen.getByTestId("search-dropdown-categories")).toBeInTheDocument();
      expect(screen.getByTestId("search-dropdown-organizations")).toBeInTheDocument();
      expect(screen.getByTestId("search-dropdown-ecosystems")).toBeInTheDocument();
      expect(screen.getByTestId("search-dropdown-mechanisms")).toBeInTheDocument();
      expect(screen.getByTestId("search-dropdown-platforms")).toBeInTheDocument();
    });

    it("renders the open enrollment checkbox defaulting to checked", () => {
      renderWithProviders(<AddProgram />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("renders submit button with Create text for new program", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.getByText("Create program")).toBeInTheDocument();
    });

    it("renders submit button with Update text for editing", () => {
      renderWithProviders(
        <AddProgram
          programToEdit={
            {
              programId: "p1",
              metadata: { title: "Test" },
            } as any
          }
          backTo={vi.fn()}
        />
      );
      expect(screen.getByText("Update program")).toBeInTheDocument();
    });

    it("renders Back to programs link for new program", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.getByText("Back to programs")).toBeInTheDocument();
    });

    it("renders Back to Manage Programs button for editing", () => {
      renderWithProviders(
        <AddProgram
          programToEdit={
            {
              programId: "p1",
              metadata: { title: "Test" },
            } as any
          }
          backTo={vi.fn()}
        />
      );
      expect(screen.getByText("Back to Manage Programs")).toBeInTheDocument();
    });
  });

  describe("admin-only fields", () => {
    it("does not render email fields when isAdmin is false", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.queryByText("Admin Emails (optional)")).not.toBeInTheDocument();
      expect(screen.queryByText("Finance Emails *")).not.toBeInTheDocument();
    });

    it("renders email fields when isAdmin is true", () => {
      renderWithProviders(<AddProgram isAdmin={true} />);
      expect(screen.getByText("Admin Emails (optional)")).toBeInTheDocument();
      expect(screen.getByText("Finance Emails *")).toBeInTheDocument();
    });
  });

  describe("status dropdown", () => {
    it("does not render status dropdown for new programs", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.queryByTestId("status-dropdown")).not.toBeInTheDocument();
    });

    it("renders status dropdown when editing a program", () => {
      renderWithProviders(
        <AddProgram
          programToEdit={
            {
              programId: "p1",
              metadata: { title: "Test", status: "Active" },
            } as any
          }
          backTo={vi.fn()}
        />
      );
      expect(screen.getByTestId("status-dropdown")).toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("shows error when name is too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      const nameInput = screen.getByLabelText("Program name *");
      await user.type(nameInput, "AB");

      // Trigger validation by clicking elsewhere
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument();
      });
    });

    it("shows error when program website is invalid", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      const websiteInput = screen.getByLabelText("Program website *");
      await user.type(websiteInput, "not-a-url");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
      });
    });

    it("does not show error for valid URL", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      const websiteInput = screen.getByLabelText("Program website *");
      await user.type(websiteInput, "https://example.com");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
      });
    });

    it("enforces short description max length of 100", () => {
      renderWithProviders(<AddProgram />);

      const shortDescInput = screen.getByLabelText("One-line Description");
      expect(shortDescInput).toHaveAttribute("maxLength", "100");
    });

    it("shows character counter for short description", () => {
      renderWithProviders(<AddProgram />);
      expect(screen.getByText("0/100")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls fetchData on create when required fields are filled", async () => {
      const fetchData = require("@/utilities/fetchData").default;
      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      // Fill required fields
      const nameInput = screen.getByLabelText("Program name *");
      await user.type(nameInput, "Test Program Name");

      const websiteInput = screen.getByLabelText("Program website *");
      await user.type(websiteInput, "https://example.com");

      // Fill description via textarea
      const descriptionTextarea = screen.getByPlaceholderText(
        "Please provide a description of this program"
      );
      await user.type(descriptionTextarea, "A detailed description of the program");

      // Submit
      const submitButton = screen.getByText("Create program");
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchData).toHaveBeenCalledWith(
          "/v2/registry/create",
          "POST",
          expect.objectContaining({
            chainId: expect.anything(),
            metadata: expect.objectContaining({
              title: "Test Program Name",
            }),
          }),
          {},
          {},
          true
        );
      });
    });

    it("shows loading state on submit button during submission", async () => {
      // Make fetchData hang to keep loading state active
      const fetchData = require("@/utilities/fetchData").default;
      fetchData.mockReturnValue(new Promise(() => {}));

      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      const nameInput = screen.getByLabelText("Program name *");
      await user.type(nameInput, "Test Program Name");

      const websiteInput = screen.getByLabelText("Program website *");
      await user.type(websiteInput, "https://example.com");

      const descriptionTextarea = screen.getByPlaceholderText(
        "Please provide a description of this program"
      );
      await user.type(descriptionTextarea, "A detailed description of the program");

      const submitButton = screen.getByText("Create program");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });
    });

    it("shows error toast when submission fails", async () => {
      const fetchData = require("@/utilities/fetchData").default;
      fetchData.mockResolvedValue([null, "Server error"]);
      const toast = require("react-hot-toast").default;
      const { errorManager } = require("@/components/Utilities/errorManager");

      const user = userEvent.setup();
      renderWithProviders(<AddProgram />);

      const nameInput = screen.getByLabelText("Program name *");
      await user.type(nameInput, "Test Program Name");

      const websiteInput = screen.getByLabelText("Program website *");
      await user.type(websiteInput, "https://example.com");

      const descriptionTextarea = screen.getByPlaceholderText(
        "Please provide a description of this program"
      );
      await user.type(descriptionTextarea, "A detailed description of the program");

      const submitButton = screen.getByText("Create program");
      await user.click(submitButton);

      await waitFor(() => {
        expect(errorManager).toHaveBeenCalledWith(
          expect.stringContaining("Failed to create program"),
          expect.anything(),
          expect.anything(),
          expect.anything()
        );
      });
    });
  });

  describe("form prefilling (edit mode)", () => {
    it("prefills form fields when programToEdit is provided", () => {
      renderWithProviders(
        <AddProgram
          programToEdit={
            {
              programId: "p1",
              chainID: 10,
              metadata: {
                title: "Existing Program",
                description: "A great program",
                shortDescription: "Short desc",
                website: "https://example.com",
                projectTwitter: "https://x.com/test",
                startsAt: "2024-01-01T00:00:00Z",
                categories: ["DeFi"],
                ecosystems: ["Ethereum"],
                organizations: [],
                networks: [],
                grantTypes: ["Grant"],
                platformsUsed: [],
                communityRef: [],
                anyoneCanJoin: false,
                status: "Active",
                socialLinks: {
                  grantsSite: "https://grants.example.com",
                },
              },
            } as any
          }
          backTo={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Program name *")).toHaveValue("Existing Program");
      expect(screen.getByLabelText("Program website *")).toHaveValue("https://grants.example.com");
    });
  });
});
