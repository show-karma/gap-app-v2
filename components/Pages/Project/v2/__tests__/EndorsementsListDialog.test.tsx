import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { EndorsementsListDialog } from "../EndorsementsListDialog";

// Mock the project store with different data per test
let mockProjectData: { endorsements: unknown[] } | null = null;

jest.mock("@/store", () => ({
  useProjectStore: jest.fn((selector) => {
    const state = { project: mockProjectData };
    return selector(state);
  }),
}));

jest.mock("@/store/ens", () => ({
  useENS: () => ({
    ensData: {},
    populateEns: jest.fn(),
  }),
}));

// Mock EthereumAddressToENSAvatar
jest.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => (
    <div data-testid="avatar">{address.slice(0, 6)}</div>
  ),
}));

// Mock MarkdownPreview
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div>{source}</div>,
}));

// Default mock project data
const defaultMockProject = {
  endorsements: [
    {
      uid: "endorsement-1",
      endorsedBy: "0x1234567890123456789012345678901234567890",
      comment: "Great project!",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      uid: "endorsement-2",
      endorsedBy: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      comment: "",
      createdAt: "2024-01-14T10:00:00Z",
    },
    {
      uid: "endorsement-3",
      endorsedBy: "0x9876543210987654321098765432109876543210",
      comment: "Amazing work on this project!",
      createdAt: "2024-01-13T10:00:00Z",
    },
  ],
};

describe("EndorsementsListDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectData = defaultMockProject;
  });

  it("renders the dialog when open", () => {
    render(<EndorsementsListDialog {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Endorsements")).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    render(<EndorsementsListDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays endorsement count in title", () => {
    render(<EndorsementsListDialog {...defaultProps} />);

    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("displays endorsement rows with user info", () => {
    render(<EndorsementsListDialog {...defaultProps} />);

    // Check for shortened addresses (mock doesn't have ENS names)
    // shortAddress returns first 6 chars + "..." + last 6 chars
    expect(screen.getByText("0x1234...567890")).toBeInTheDocument();
    expect(screen.getByText("0xabcd...efabcd")).toBeInTheDocument();
    expect(screen.getByText("0x9876...543210")).toBeInTheDocument();
  });

  it("displays endorsement comments", () => {
    render(<EndorsementsListDialog {...defaultProps} />);

    expect(screen.getByText("Great project!")).toBeInTheDocument();
    expect(screen.getByText("Amazing work on this project!")).toBeInTheDocument();
  });

  it("shows description text", () => {
    render(<EndorsementsListDialog {...defaultProps} />);

    expect(screen.getByText("People who have endorsed this project on-chain")).toBeInTheDocument();
  });

  it("calls onOpenChange when close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(<EndorsementsListDialog open={true} onOpenChange={onOpenChange} />);

    const closeButton = screen.getByTestId("modal-close-button");
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows empty state when no endorsements", () => {
    mockProjectData = { endorsements: [] };

    render(<EndorsementsListDialog {...defaultProps} />);

    expect(screen.getByText(/No endorsements yet/)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to endorse this project!/)).toBeInTheDocument();
  });
});

describe("EndorsementsListDialog - Pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows load more button when there are more than 12 endorsements", () => {
    // Create 15 unique endorsements with different addresses
    const manyEndorsements = Array.from({ length: 15 }, (_, i) => ({
      uid: `endorsement-${i}`,
      endorsedBy: `0x${(i + 1).toString(16).padStart(40, "0")}`,
      comment: `Comment ${i}`,
      createdAt: new Date(2024, 0, 15 - i).toISOString(),
    }));

    mockProjectData = { endorsements: manyEndorsements };

    render(<EndorsementsListDialog open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("Load more")).toBeInTheDocument();
  });
});
