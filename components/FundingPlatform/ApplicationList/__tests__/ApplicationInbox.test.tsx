import { fireEvent, render, screen } from "@testing-library/react";
import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";
import ApplicationInbox from "../ApplicationInbox";

// Stub the heavy detail view — we only assert which application id it receives.
vi.mock("../../ApplicationView/ApplicationDetailView", () => ({
  default: ({ applicationId }: { applicationId: string }) => (
    <div data-testid="detail-view">{applicationId}</div>
  ),
}));

// Render InfiniteScroll children directly (no scroll virtualization in tests).
vi.mock("react-infinite-scroll-component", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const createMockApplication = (
  overrides: Partial<IFundingApplication> = {}
): IFundingApplication => ({
  id: "app-1",
  programId: "101011",
  chainID: 10,
  applicantEmail: "arthur@karmahq.xyz",
  ownerAddress: "0xabc",
  applicationData: {},
  status: "under_review" as FundingApplicationStatusV2,
  statusHistory: [],
  referenceNumber: "APP-ONE",
  submissionIP: "127.0.0.1",
  createdAt: "2026-02-05T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  resolvedProjectName: "First Application",
  ...overrides,
});

const baseProps = {
  programId: "101011",
  communityId: "filecoin",
  combinedProgramId: "101011_10",
  fetchNextPage: vi.fn(),
};

describe("ApplicationInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  it("shows the loading message while the first page loads", () => {
    render(<ApplicationInbox {...baseProps} applications={[]} isLoading total={0} />);

    expect(screen.getByText("Assigned to you")).toBeInTheDocument();
    expect(screen.getByText("Loading your applications…")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-view")).not.toBeInTheDocument();
  });

  it("shows an empty state when no applications are assigned", () => {
    render(<ApplicationInbox {...baseProps} applications={[]} isLoading={false} total={0} />);

    expect(screen.getByText("No applications are assigned to you yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Select an application from the list to review it.")
    ).toBeInTheDocument();
  });

  it("renders the list and selects the first application by default", () => {
    const applications = [
      createMockApplication(),
      createMockApplication({ referenceNumber: "APP-TWO", resolvedProjectName: "Second" }),
    ];

    render(
      <ApplicationInbox {...baseProps} applications={applications} isLoading={false} total={2} />
    );

    expect(screen.getByText("First Application")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("2 applications")).toBeInTheDocument();
    // Default selection drives the detail view.
    expect(screen.getByTestId("detail-view")).toHaveTextContent("APP-ONE");
  });

  it("updates the detail view and URL hash when a different item is selected", () => {
    const applications = [
      createMockApplication(),
      createMockApplication({ referenceNumber: "APP-TWO", resolvedProjectName: "Second" }),
    ];

    render(
      <ApplicationInbox {...baseProps} applications={applications} isLoading={false} total={2} />
    );

    fireEvent.click(screen.getByText("Second"));

    expect(screen.getByTestId("detail-view")).toHaveTextContent("APP-TWO");
    expect(window.location.hash).toBe("#application-APP-TWO");
  });

  it("re-points the detail to the first item when the selected one is filtered out", () => {
    const applications = [
      createMockApplication(),
      createMockApplication({ referenceNumber: "APP-TWO", resolvedProjectName: "Second" }),
    ];

    const { rerender } = render(
      <ApplicationInbox {...baseProps} applications={applications} isLoading={false} total={2} />
    );
    expect(screen.getByTestId("detail-view")).toHaveTextContent("APP-ONE");

    // A filter removes the selected APP-ONE; only APP-TWO remains.
    rerender(
      <ApplicationInbox
        {...baseProps}
        applications={[applications[1]]}
        isLoading={false}
        total={1}
      />
    );

    expect(screen.getByTestId("detail-view")).toHaveTextContent("APP-TWO");
  });

  it("clears the detail when the filtered result set is empty", () => {
    const { rerender } = render(
      <ApplicationInbox
        {...baseProps}
        applications={[createMockApplication()]}
        isLoading={false}
        total={1}
      />
    );
    expect(screen.getByTestId("detail-view")).toHaveTextContent("APP-ONE");

    // Filter yields no matches (settled, not loading).
    rerender(<ApplicationInbox {...baseProps} applications={[]} isLoading={false} total={0} />);

    expect(screen.queryByTestId("detail-view")).not.toBeInTheDocument();
    expect(
      screen.getByText("Select an application from the list to review it.")
    ).toBeInTheDocument();
  });
});
