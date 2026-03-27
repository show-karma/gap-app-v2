import { render, screen } from "@testing-library/react";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
}));

// Mock ActivityCard to avoid complex import chain
vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: () => <div data-testid="activity-card" />,
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
