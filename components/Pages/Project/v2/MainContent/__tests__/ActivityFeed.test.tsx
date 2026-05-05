import { render, screen } from "@testing-library/react";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
}));

// Mock ActivityCard to avoid complex import chain - renders title and allocation for test assertions
vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({
    activity,
  }: {
    activity: { data?: { title?: string }; allocationAmount?: string };
  }) => (
    <div data-testid="activity-card">
      {activity?.data?.title}
      {activity.allocationAmount && <span>{activity.allocationAmount}</span>}
    </div>
  ),
}));

// Mock EthereumAddressToProfileName
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => (
    <span data-testid="ens-name">{address?.slice(0, 8)}...</span>
  ),
}));

// Mock ProfilePicture
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => <div data-testid="profile-picture">{name}</div>,
}));

// Mock formatCurrency
vi.mock("@/utilities/formatCurrency", () => ({
  __esModule: true,
  default: (num: number) => `$${num}`,
}));

// Mock useMilestoneAllocationsByGrants
const mockAllocationMap = new Map<string, string>();
vi.mock("@/hooks/useCommunityMilestoneAllocations", () => ({
  useMilestoneAllocationsByGrants: () => ({
    allocationMap: mockAllocationMap,
    grantTotalMap: new Map(),
    isLoading: false,
  }),
}));

// Import component after mocks
import { ActivityFeed } from "../ActivityFeed";

describe("ActivityFeed - Activity Type Labels", () => {
  const createMilestone = (
    type: UnifiedMilestone["type"],
    overrides: Partial<UnifiedMilestone> = {}
  ): UnifiedMilestone => ({
    uid: `test-${type}-1`,
    type,
    title: `Test ${type}`,
    description: "Test description",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "0xref1",
    source: {
      type,
    },
    ...overrides,
  });

  it("should display 'Milestone created' for type 'milestone'", () => {
    const milestones = [createMilestone("milestone")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Milestone created")).toBeInTheDocument();
  });

  it("should display 'Milestone created' for type 'grant'", () => {
    const milestones = [createMilestone("grant")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Milestone created")).toBeInTheDocument();
  });

  it("should display 'Project Activity' for type 'activity'", () => {
    const milestones = [createMilestone("activity")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Project Activity")).toBeInTheDocument();
  });

  it("should display 'Project Activity' for type 'update'", () => {
    const milestones = [createMilestone("update")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Project Activity")).toBeInTheDocument();
  });

  it("should display 'Grant Update' for type 'grant_update'", () => {
    const milestones = [createMilestone("grant_update")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant Update")).toBeInTheDocument();
  });

  it("should display 'Milestone created' for type 'impact'", () => {
    // Note: Impact type displays as "Milestone created" per getActivityTypeLabel implementation
    const milestones = [createMilestone("impact")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Milestone created")).toBeInTheDocument();
  });

  it("should display 'Grant approved' for type 'grant_received' with no programType", () => {
    const milestones = [
      createMilestone("grant_received", {
        grantReceived: {
          amount: "1000 USDC",
          communityName: "Test Community",
          communityImage: "https://example.com/image.png",
          grantTitle: "Test Grant",
          grantUID: "0xgrant1",
        },
      }),
    ];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
  });

  it("should display 'Grant approved' for type 'grant_received' with programType 'grant'", () => {
    const milestones = [
      createMilestone("grant_received", {
        grantReceived: {
          amount: "1000 USDC",
          communityName: "Test Community",
          communityImage: "https://example.com/image.png",
          grantTitle: "Test Grant",
          grantUID: "0xgrant1",
          programType: "grant",
        },
      }),
    ];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
  });

  it("should display 'Hackathon participation' for type 'grant_received' with programType 'hackathon'", () => {
    const milestones = [
      createMilestone("grant_received", {
        grantReceived: {
          amount: "500 ETH",
          communityName: "Hackathon Org",
          communityImage: "https://example.com/hack.png",
          grantTitle: "ETHGlobal",
          grantUID: "0xhack1",
          programType: "hackathon",
        },
      }),
    ];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Hackathon participation")).toBeInTheDocument();
  });

  it("should show empty state when no milestones", () => {
    render(<ActivityFeed milestones={[]} />);

    expect(screen.getByTestId("activity-feed-empty")).toBeInTheDocument();
    expect(screen.getByText("No activities to display")).toBeInTheDocument();
  });
});

describe("ActivityFeed - Grant Title Display", () => {
  const createGrantReceived = (
    overrides: Partial<NonNullable<UnifiedMilestone["grantReceived"]>> = {}
  ): UnifiedMilestone => ({
    uid: "test-grant-received-1",
    type: "grant_received",
    title: "Grant received",
    description: "",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "0xref1",
    source: { type: "grant_received" },
    grantReceived: {
      amount: "1000 USDC",
      communityName: "Test Community",
      communityImage: "https://example.com/image.png",
      grantTitle: "Test Grant",
      grantUID: "0xgrant1",
      ...overrides,
    },
  });

  it("should show grant title below community name when both exist and differ", () => {
    const milestones = [createGrantReceived()];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
    expect(screen.getByTestId("grant-title")).toHaveTextContent("Test Grant");
  });

  it("should fall back to community name only when grantTitle is undefined", () => {
    const milestones = [createGrantReceived({ grantTitle: undefined })];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
    expect(screen.queryByTestId("grant-title")).not.toBeInTheDocument();
  });

  it("should fall back to community name only when grantTitle is empty string", () => {
    const milestones = [createGrantReceived({ grantTitle: "" })];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
    expect(screen.queryByTestId("grant-title")).not.toBeInTheDocument();
  });

  it("should not duplicate display when grantTitle equals communityName (case-insensitive)", () => {
    const milestones = [
      createGrantReceived({
        communityName: "Test Community",
        grantTitle: "test community",
      }),
    ];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("Grant approved")).toBeInTheDocument();
    expect(screen.queryByTestId("grant-title")).not.toBeInTheDocument();
  });
});

describe("ActivityFeed - Allocation Amount Pill", () => {
  const createMilestoneWithGrant = (uid: string): UnifiedMilestone => ({
    uid,
    type: "milestone",
    title: "Test Milestone",
    description: "Test",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "0xref1",
    source: {
      type: "milestone",
      grantMilestone: {
        milestone: { uid, title: "Test", description: "", endsAt: 0 },
        grant: {
          uid: "grant-1",
          chainID: 1,
          details: { title: "Grant 1" },
        },
      },
    },
  });

  afterEach(() => {
    mockAllocationMap.clear();
  });

  it("should_display_allocation_pill_when_amount_available", () => {
    mockAllocationMap.set("ms-1", "60,000 USDC");
    const milestones = [createMilestoneWithGrant("ms-1")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.getByText("60,000 USDC")).toBeInTheDocument();
  });

  it("should_not_display_allocation_pill_when_no_amount", () => {
    const milestones = [createMilestoneWithGrant("ms-1")];
    render(<ActivityFeed milestones={milestones} />);

    expect(screen.queryByText(/USDC/)).not.toBeInTheDocument();
  });
});

describe("ActivityFeed - renders pre-filtered items from server", () => {
  // Milestone status filtering is now done server-side via the API query param.
  // ActivityFeed renders whatever milestones are passed to it without further status filtering.
  const createMilestone = (
    type: UnifiedMilestone["type"],
    overrides: Partial<UnifiedMilestone> = {}
  ): UnifiedMilestone => ({
    uid: `test-${type}-${Math.random()}`,
    type,
    title: `Test ${type}`,
    description: "Test description",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "0xref1",
    source: {},
    ...overrides,
  });

  it("renders all passed items regardless of their milestone status", () => {
    const items = [
      createMilestone("milestone", {
        uid: "pending-ms",
        title: "Pending Milestone",
        completed: false,
      }),
      createMilestone("grant", {
        uid: "completed-ms",
        title: "Completed Milestone",
        completed: { createdAt: "2024-01-01", data: { reason: "Done" } },
        source: {
          grantMilestone: {
            milestone: { uid: "m1", chainID: 1, title: "Completed", verified: [] },
            grant: { uid: "g1", chainID: 1 },
          },
        },
      }),
      createMilestone("grant_update", { uid: "update-item", title: "Grant Update Item" }),
    ];

    render(<ActivityFeed milestones={items} />);

    const rendered = screen.getAllByTestId("activity-item");
    expect(rendered).toHaveLength(3);
  });

  it("shows empty state when no milestones are passed", () => {
    render(<ActivityFeed milestones={[]} />);

    expect(screen.getByTestId("activity-feed-empty")).toBeInTheDocument();
  });
});

describe("ActivityFeed - completed-first ordering", () => {
  const createMilestone = (
    type: UnifiedMilestone["type"],
    overrides: Partial<UnifiedMilestone> = {}
  ): UnifiedMilestone => ({
    uid: `test-${type}-${Math.random()}`,
    type,
    title: `Test ${type}`,
    description: "Test description",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "0xref1",
    source: {},
    ...overrides,
  });

  // Repro for the bug seen on /project/filecoin-infrastructure-services: a completed
  // milestone whose completed.createdAt is in the past was sinking below pending
  // milestones whose endsAt is in the future, because the previous single-key sort
  // compared those two values directly.
  it("places a completed milestone above pending ones with future endsAt (newest sort)", () => {
    const completed = createMilestone("grant", {
      uid: "completed-ms",
      title: "Completed Milestone",
      completed: { createdAt: "2026-04-28T00:00:00.000Z", data: { reason: "Done" } },
      endsAt: 1777334400, // 2026-04-28
    });
    const pendingFutureA = createMilestone("grant", {
      uid: "pending-future-a",
      title: "Pending A",
      completed: false,
      endsAt: 1788220800, // 2026-06-27
    });
    const pendingFutureB = createMilestone("grant", {
      uid: "pending-future-b",
      title: "Pending B",
      completed: false,
      endsAt: 1803859200, // 2026-12-25
    });

    render(
      <ActivityFeed milestones={[pendingFutureA, completed, pendingFutureB]} sortBy="newest" />
    );

    const cards = screen.getAllByTestId("activity-card");
    expect(cards[0]).toHaveTextContent("Completed Milestone");
  });

  it("places a completed milestone below pending ones when sortBy is oldest", () => {
    const completed = createMilestone("grant", {
      uid: "completed-ms",
      title: "Completed Milestone",
      completed: { createdAt: "2026-04-28T00:00:00.000Z", data: { reason: "Done" } },
    });
    const pending = createMilestone("grant", {
      uid: "pending-ms",
      title: "Pending Milestone",
      completed: false,
      endsAt: 1803859200,
    });

    render(<ActivityFeed milestones={[completed, pending]} sortBy="oldest" />);

    const cards = screen.getAllByTestId("activity-card");
    expect(cards[0]).toHaveTextContent("Pending Milestone");
    expect(cards[1]).toHaveTextContent("Completed Milestone");
  });
});
