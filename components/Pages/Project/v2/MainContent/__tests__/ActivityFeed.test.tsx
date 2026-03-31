import { render, screen } from "@testing-library/react";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
}));

// Mock ActivityCard to avoid complex import chain - renders title for test assertions
vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data?: { title?: string } } }) => (
    <div data-testid="activity-card">{activity?.data?.title}</div>
  ),
}));

// Mock EthereumAddressToENSAvatar
vi.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <div data-testid="ens-avatar">{address}</div>,
}));

// Mock EthereumAddressToENSName
vi.mock("@/components/EthereumAddressToENSName", () => ({
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

describe("ActivityFeed - Milestone Status Filtering", () => {
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

  const pendingMilestone = createMilestone("milestone", {
    uid: "pending-ms",
    title: "Pending Milestone",
    completed: false,
    source: {},
  });

  const completedMilestone = createMilestone("grant", {
    uid: "completed-ms",
    title: "Completed Milestone",
    completed: { createdAt: "2024-01-01", data: { reason: "Done" } },
    source: {
      grantMilestone: {
        milestone: { uid: "m1", chainID: 1, title: "Completed", verified: [] },
        grant: { uid: "g1", chainID: 1 },
      },
    },
  });

  const verifiedMilestone = createMilestone("grant", {
    uid: "verified-ms",
    title: "Verified Milestone",
    completed: { createdAt: "2024-01-01", data: { reason: "Done" } },
    source: {
      grantMilestone: {
        milestone: {
          uid: "m2",
          chainID: 1,
          title: "Verified",
          verified: [{ uid: "v1", attester: "0xverifier", createdAt: "2024-01-02" }],
        },
        grant: { uid: "g1", chainID: 1 },
      },
    },
  });

  const updateItem = createMilestone("grant_update", {
    uid: "update-item",
    title: "Grant Update Item",
  });

  const allItems = [pendingMilestone, completedMilestone, verifiedMilestone, updateItem];

  it("shows all items when milestoneStatusFilter is 'all'", () => {
    render(<ActivityFeed milestones={allItems} milestoneStatusFilter="all" />);

    const items = screen.getAllByTestId("activity-item");
    expect(items).toHaveLength(4);
  });

  it("filters to only pending milestones (plus non-milestone items) when status is 'pending'", () => {
    render(<ActivityFeed milestones={allItems} milestoneStatusFilter="pending" />);

    const items = screen.getAllByTestId("activity-item");
    // pending milestone + update item (non-milestone passes through)
    expect(items).toHaveLength(2);
    expect(screen.getByText("Pending Milestone")).toBeInTheDocument();
    expect(screen.getByText("Grant Update Item")).toBeInTheDocument();
  });

  it("filters to only completed milestones (plus non-milestone items) when status is 'completed'", () => {
    render(<ActivityFeed milestones={allItems} milestoneStatusFilter="completed" />);

    const items = screen.getAllByTestId("activity-item");
    // completed milestone + update item
    expect(items).toHaveLength(2);
    expect(screen.getByText("Completed Milestone")).toBeInTheDocument();
    expect(screen.getByText("Grant Update Item")).toBeInTheDocument();
  });

  it("filters to only verified milestones (plus non-milestone items) when status is 'verified'", () => {
    render(<ActivityFeed milestones={allItems} milestoneStatusFilter="verified" />);

    const items = screen.getAllByTestId("activity-item");
    // verified milestone + update item
    expect(items).toHaveLength(2);
    expect(screen.getByText("Verified Milestone")).toBeInTheDocument();
    expect(screen.getByText("Grant Update Item")).toBeInTheDocument();
  });

  it("shows empty state when no items match the milestone status filter", () => {
    const milestonesOnly = [pendingMilestone];
    render(<ActivityFeed milestones={milestonesOnly} milestoneStatusFilter="verified" />);

    expect(screen.getByTestId("activity-feed-empty")).toBeInTheDocument();
  });

  it("combines activeFilters and milestoneStatusFilter correctly", () => {
    // Only milestones filter active + pending status = only pending milestones
    render(
      <ActivityFeed
        milestones={allItems}
        activeFilters={["milestones"]}
        milestoneStatusFilter="pending"
      />
    );

    const items = screen.getAllByTestId("activity-item");
    // Only the pending milestone (update item is filtered out by activeFilters)
    expect(items).toHaveLength(1);
    expect(screen.getByText("Pending Milestone")).toBeInTheDocument();
  });
});
