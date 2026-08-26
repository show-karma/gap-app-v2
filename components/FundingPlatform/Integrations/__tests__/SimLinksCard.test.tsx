import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type {
  SimocracyProgramSummary,
  SimocracySimLink,
} from "@/services/fundingApplicationIntegrations.service";
import { SimLinksCard } from "../SimLinksCard";

const mockUseSimocracySimLinks = vi.fn();
const mockUseSimocracyProgramSummary = vi.fn();
const mockAddSimLinkAsync = vi.fn();
const mockDeleteSimLinkAsync = vi.fn();

vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useSimocracySimLinks: (programId: string) => mockUseSimocracySimLinks(programId),
  useSimocracyProgramSummary: (programId: string) => mockUseSimocracyProgramSummary(programId),
  useSimocracySimLinkMutations: () => ({
    addSimLinkAsync: mockAddSimLinkAsync,
    isAdding: false,
    deleteSimLinkAsync: mockDeleteSimLinkAsync,
    isDeleting: false,
    deletingSimUri: undefined,
  }),
}));

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({
    deleteFunction,
    externalIsOpen,
    externalSetIsOpen,
  }: {
    deleteFunction: () => Promise<void>;
    externalIsOpen?: boolean;
    externalSetIsOpen?: (isOpen: boolean) => void;
  }) => {
    if (!externalIsOpen) return null;
    return (
      <div data-testid="delete-dialog">
        <button
          type="button"
          onClick={async () => {
            await deleteFunction();
            externalSetIsOpen?.(false);
          }}
        >
          Continue
        </button>
      </div>
    );
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const OWN_ADDRESS = "0x1111111111111111111111111111111111111111";
const OTHER_ADDRESS = "0x2222222222222222222222222222222222222222";

const SIM_A = "at://did:plc:aaa/org.simocracy.sim/1";
const SIM_B = "at://did:plc:bbb/org.simocracy.sim/2";

function createLinks(overrides: SimocracySimLink[] = []): SimocracySimLink[] {
  if (overrides.length > 0) return overrides;
  return [
    { simUri: SIM_A, publicAddress: OWN_ADDRESS },
    { simUri: SIM_B, publicAddress: OTHER_ADDRESS },
  ];
}

function createSummary(overrides: Partial<SimocracyProgramSummary> = {}): SimocracyProgramSummary {
  return {
    programId: "simo-test-1",
    gatheringUri: "at://did:plc:abc/org.simocracy.gathering/xyz",
    enabled: true,
    sims: [
      { simUri: SIM_A, simName: "S1", avatar: null },
      { simUri: SIM_B, simName: "S2", avatar: null },
    ],
    latestRunId: null,
    decisionStatus: null,
    ratifiedAt: null,
    allocations: null,
    ...overrides,
  };
}

function mockQueries({
  links = createLinks(),
  isLoading = false,
  isError = false,
  summary = createSummary(),
}: {
  links?: SimocracySimLink[];
  isLoading?: boolean;
  isError?: boolean;
  summary?: SimocracyProgramSummary | undefined;
} = {}) {
  mockUseSimocracySimLinks.mockReturnValue({
    data: isLoading || isError ? undefined : links,
    isLoading,
    isError,
    error: isError ? new Error("links failed") : null,
    refetch: vi.fn(),
  });
  mockUseSimocracyProgramSummary.mockReturnValue({ data: summary });
}

let queryClient: QueryClient;

function renderCard(
  props: Partial<{ canManage: boolean; isReviewer: boolean; viewerAddress?: string }> = {}
) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <SimLinksCard
      programId="simo-test-1"
      canManage={props.canManage ?? false}
      isReviewer={props.isReviewer ?? false}
      viewerAddress={props.viewerAddress}
    />,
    { wrapper }
  );
}

describe("SimLinksCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe("loading state", () => {
    it("renders a skeleton while links load", () => {
      mockQueries({ isLoading: true });

      renderCard({ canManage: true });

      expect(screen.getByTestId("sim-links-loading")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders the error with a retry action", () => {
      mockQueries({ isError: true });

      renderCard({ canManage: true });

      expect(screen.getByText("links failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders the empty state when there are no links", () => {
      mockQueries({ links: [] });

      renderCard({ canManage: true });

      expect(screen.getByText(/no sims linked yet/i)).toBeInTheDocument();
    });
  });

  describe("admin (PROGRAM_EDIT)", () => {
    it("shows a delete button on every row and an editable address input", () => {
      mockQueries();

      renderCard({ canManage: true, viewerAddress: OWN_ADDRESS });

      expect(screen.getAllByRole("button", { name: /^remove link for/i })).toHaveLength(2);
      expect(screen.getByLabelText("Reviewer address")).toBeEnabled();
    });

    it("enriches rows with sim names from the program summary", () => {
      mockQueries();

      renderCard({ canManage: true });

      expect(screen.getByText("S1")).toBeInTheDocument();
      expect(screen.getByText("S2")).toBeInTheDocument();
    });

    it("deletes a row through the confirmation dialog", async () => {
      mockQueries();
      mockDeleteSimLinkAsync.mockResolvedValue(undefined);

      renderCard({ canManage: true });

      fireEvent.click(screen.getAllByRole("button", { name: /^remove link for/i })[0]);
      fireEvent.click(await screen.findByText("Continue"));

      await waitFor(() => {
        expect(mockDeleteSimLinkAsync).toHaveBeenCalledWith(SIM_A);
      });
    });
  });

  describe("reviewer (no PROGRAM_EDIT)", () => {
    it("only shows delete on the reviewer's own row", () => {
      mockQueries();

      renderCard({ isReviewer: true, viewerAddress: OWN_ADDRESS });

      const deleteButtons = screen.getAllByRole("button", { name: /^remove link for/i });
      expect(deleteButtons).toHaveLength(1);
      expect(deleteButtons[0]).toHaveAccessibleName(/S1/);
    });

    it("matches the viewer address case-insensitively", () => {
      mockQueries({
        links: [{ simUri: SIM_A, publicAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" }],
      });

      renderCard({
        isReviewer: true,
        viewerAddress: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD",
      });

      expect(screen.getAllByRole("button", { name: /^remove link for/i })).toHaveLength(1);
    });

    it("locks the address input to the reviewer's own address", () => {
      mockQueries();

      renderCard({ isReviewer: true, viewerAddress: OWN_ADDRESS });

      const addressInput = screen.getByLabelText("Reviewer address");
      expect(addressInput).toBeDisabled();
      expect(addressInput).toHaveValue(OWN_ADDRESS);
    });

    it("adds a link with the reviewer's own address via the custom AT-URI input", async () => {
      // No unlinked sims left → the free-text AT-URI input renders instead of the picker.
      mockQueries({ summary: createSummary({ sims: [] }) });
      mockAddSimLinkAsync.mockResolvedValue([]);

      renderCard({ isReviewer: true, viewerAddress: OWN_ADDRESS });

      fireEvent.change(screen.getByLabelText("Sim AT-URI"), {
        target: { value: "at://did:plc:ccc/org.simocracy.sim/3" },
      });
      fireEvent.click(screen.getByRole("button", { name: /add link/i }));

      await waitFor(() => {
        expect(mockAddSimLinkAsync).toHaveBeenCalledWith({
          simUri: "at://did:plc:ccc/org.simocracy.sim/3",
          publicAddress: OWN_ADDRESS,
        });
      });
    });

    it("rejects an invalid AT-URI with an inline error and no mutation", async () => {
      mockQueries({ summary: createSummary({ sims: [] }) });

      renderCard({ isReviewer: true, viewerAddress: OWN_ADDRESS });

      fireEvent.change(screen.getByLabelText("Sim AT-URI"), {
        target: { value: "not-an-at-uri" },
      });
      fireEvent.click(screen.getByRole("button", { name: /add link/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/at:\/\//i);
      expect(mockAddSimLinkAsync).not.toHaveBeenCalled();
    });
  });

  describe("viewer without management rights", () => {
    it("hides the add form and all delete buttons", () => {
      mockQueries();

      renderCard({ canManage: false, isReviewer: false });

      expect(screen.queryByLabelText("Reviewer address")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^remove link for/i })).not.toBeInTheDocument();
    });
  });
});
