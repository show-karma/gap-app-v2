/**
 * Tests for MilestonesTab — unified renderer combining off-chain and on-chain milestones
 * under a single "Milestones" card, sorted by due date with completed items pushed down.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import type { Application } from "@/types/whitelabel-entities";
import { MilestonesTab } from "../MilestonesTab";

vi.mock("@/src/features/applications/components/OffChainMilestoneRow", () => ({
  OffChainMilestoneRow: ({ milestone }: { milestone: { title: string } }) => (
    <div data-source="offchain">
      <h4>{milestone.title}</h4>
    </div>
  ),
}));

vi.mock("@/src/features/applications/components/OnChainMilestoneRow", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/features/applications/components/OnChainMilestoneRow")
  >("@/src/features/applications/components/OnChainMilestoneRow");
  return {
    ...actual,
    OnChainMilestoneRow: ({ milestone }: { milestone: { title: string } }) => (
      <div data-source="onchain">
        <h4>{milestone.title}</h4>
      </div>
    ),
  };
});

const mockUseMilestoneCompletions = vi.fn();
vi.mock("@/src/features/applications/hooks/use-milestone-completions", () => ({
  useMilestoneCompletions: (...args: unknown[]) => mockUseMilestoneCompletions(...args),
}));

const mockUseInvoiceConfig = vi.fn();
vi.mock("@/src/features/applications/hooks/use-application-invoice-config", () => ({
  useApplicationInvoiceConfig: (...args: unknown[]) => mockUseInvoiceConfig(...args),
}));

const mockUseProjectGrantMilestones = vi.fn();
vi.mock("@/hooks/useProjectGrantMilestones", () => ({
  useProjectGrantMilestones: (...args: unknown[]) => mockUseProjectGrantMilestones(...args),
}));

function createApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    programId: "prog-1",
    chainID: 10,
    applicantEmail: "applicant@example.com",
    applicationData: {},
    status: "approved",
    statusHistory: [],
    referenceNumber: "APP-0001",
    submissionIP: "",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ownerAddress: "0xowner",
    projectUID: "0xproject",
    ...overrides,
  };
}

function createOnChain(
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion {
  return {
    uid: "0xmilestone",
    programId: "prog-1",
    chainId: 10,
    title: "On-chain milestone",
    description: "",
    dueDate: "2026-06-01",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("MilestonesTab (unified)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMilestoneCompletions.mockReturnValue({
      completions: [],
      isLoading: false,
      createCompletion: vi.fn(),
      updateCompletion: vi.fn(),
      isCreating: false,
      isUpdating: false,
    });
    mockUseInvoiceConfig.mockReturnValue({ data: null, isLoading: false });
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("should_render_empty_state_when_no_sources_exist", () => {
    render(<MilestonesTab application={createApplication({ projectUID: undefined })} isOwner />);
    expect(screen.getByText(/no milestones defined/i)).toBeInTheDocument();
  });

  it("should_render_single_milestones_card_with_merged_list", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        grantMilestones: [createOnChain({ title: "On-chain A", dueDate: "2026-04-01" })],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MilestonesTab
        application={createApplication({
          applicationData: {
            milestones: [{ title: "Off-chain B", description: "", dueDate: "2026-03-01" }],
          },
        })}
        isOwner
      />
    );

    // One card, one heading
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Milestones" })).toBeInTheDocument();
    expect(screen.queryByText("On-chain milestones")).not.toBeInTheDocument();

    // Both rows present
    expect(screen.getByText("Off-chain B")).toBeInTheDocument();
    expect(screen.getByText("On-chain A")).toBeInTheDocument();
  });

  it("should_sort_merged_list_by_dueDate_and_push_completed_to_bottom", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        grantMilestones: [
          createOnChain({ uid: "0xlate", title: "On-chain late", dueDate: "2026-09-01" }),
          createOnChain({
            uid: "0xdone",
            title: "On-chain done",
            status: "completed",
            dueDate: "2026-01-01",
            completionDetails: {
              description: "wrapped",
              completedAt: "2026-02-01",
              completedBy: "0xa",
            },
          }),
          createOnChain({ uid: "0xearly", title: "On-chain early", dueDate: "2026-02-01" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MilestonesTab
        application={createApplication({
          applicationData: {
            milestones: [
              { title: "Off-chain mid", description: "", dueDate: "2026-05-01" },
              { title: "Off-chain earliest", description: "", dueDate: "2026-01-15" },
            ],
          },
        })}
        isOwner
      />
    );

    const headings = screen.getAllByRole("heading", { level: 4 }).map((el) => el.textContent);

    expect(headings).toEqual([
      "Off-chain earliest",
      "On-chain early",
      "Off-chain mid",
      "On-chain late",
      "On-chain done",
    ]);
  });

  it("should_dedup_onchain_milestones_whose_title_matches_offchain", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        grantMilestones: [
          createOnChain({ uid: "0x1", title: "Launch Beta" }),
          createOnChain({ uid: "0x2", title: "Ship governance" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MilestonesTab
        application={createApplication({
          applicationData: {
            milestones: [{ title: "launch beta", description: "", dueDate: "2026-01-01" }],
          },
        })}
        isOwner
      />
    );

    const rows = screen.getAllByRole("heading", { level: 4 });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.textContent)).toEqual(["launch beta", "Ship governance"]);
  });

  it("should_render_retry_button_when_onchain_fails_and_offchain_is_empty", () => {
    const refetch = vi.fn();
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("boom"),
      refetch,
    });

    render(<MilestonesTab application={createApplication()} isOwner />);
    const retry = screen.getByRole("button", { name: /retry/i });
    retry.click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should_skip_onchain_fetch_when_projectUID_missing", () => {
    render(
      <MilestonesTab
        application={createApplication({
          projectUID: undefined,
          applicationData: {
            milestones: [{ title: "Only off-chain", description: "", dueDate: "2026-02-01" }],
          },
        })}
        isOwner
      />
    );

    expect(screen.getByText("Only off-chain")).toBeInTheDocument();
    // useProjectGrantMilestones still called (hook always mounts), but with empty args that make it inert.
    const lastCall = mockUseProjectGrantMilestones.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe("");
  });
});
