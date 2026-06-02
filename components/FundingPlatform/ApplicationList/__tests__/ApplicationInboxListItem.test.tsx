import { fireEvent, render, screen } from "@testing-library/react";
import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";
import { ApplicationInboxListItem } from "../ApplicationInboxListItem";

// Control AI score visibility deterministically.
const { getAIScoreMock } = vi.hoisted(() => ({ getAIScoreMock: vi.fn() }));
vi.mock("../../helper/getAIScore", () => ({
  getAIScore: (app: IFundingApplication) => getAIScoreMock(app),
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
  referenceNumber: "APP-5OD2RAAQ-PFLHNN",
  submissionIP: "127.0.0.1",
  createdAt: "2026-02-05T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  resolvedProjectName: "Cross-Chain Bridge Safety Audit",
  ...overrides,
});

describe("ApplicationInboxListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAIScoreMock.mockReturnValue(null);
  });

  it("renders reference, title, email and status", () => {
    render(
      <ApplicationInboxListItem
        application={createMockApplication()}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("APP-5OD2RAAQ-PFLHNN")).toBeInTheDocument();
    expect(screen.getByText("Cross-Chain Bridge Safety Audit")).toBeInTheDocument();
    expect(screen.getByText("arthur@karmahq.xyz")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
  });

  it("falls back to the reference number when no resolved project name", () => {
    render(
      <ApplicationInboxListItem
        application={createMockApplication({ resolvedProjectName: undefined })}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    // Reference appears both as the eyebrow and as the title fallback.
    expect(screen.getAllByText("APP-5OD2RAAQ-PFLHNN").length).toBeGreaterThanOrEqual(2);
  });

  it("reflects selection via aria-pressed", () => {
    const { rerender } = render(
      <ApplicationInboxListItem
        application={createMockApplication()}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");

    rerender(
      <ApplicationInboxListItem
        application={createMockApplication()}
        isSelected
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect with the reference on click and onHover on mouse enter", () => {
    const onSelect = vi.fn();
    const onHover = vi.fn();
    render(
      <ApplicationInboxListItem
        application={createMockApplication()}
        isSelected={false}
        onSelect={onSelect}
        onHover={onHover}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("APP-5OD2RAAQ-PFLHNN");

    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(onHover).toHaveBeenCalledWith("APP-5OD2RAAQ-PFLHNN");
  });

  it("shows the AI score only when present", () => {
    getAIScoreMock.mockReturnValue(82);
    const { rerender } = render(
      <ApplicationInboxListItem
        application={createMockApplication()}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("82")).toBeInTheDocument();

    getAIScoreMock.mockReturnValue(null);
    rerender(
      <ApplicationInboxListItem
        application={createMockApplication({ referenceNumber: "APP-OTHER" })}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText("82")).not.toBeInTheDocument();
  });
});
