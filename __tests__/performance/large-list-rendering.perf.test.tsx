/**
 * Performance regression tests for large list rendering.
 *
 * Tests that the ApplicationTable component can render a large number of rows
 * within a reasonable time budget. This catches regressions such as:
 *   - Accidental removal of React.memo wrappers
 *   - Expensive computations inside .map() loops
 *   - Inline object/array allocations that break memoisation
 *
 * The threshold is intentionally generous (2 000 ms for 200 rows in jsdom)
 * so the test is not flaky in CI, while still catching O(n^2) regressions.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

// --- Mocks for child components that pull in heavy dependencies ----------

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className} />
  ),
}));

vi.mock("@/components/KycStatusIcon", () => ({
  KycStatusBadge: () => <span data-testid="kyc-badge" />,
}));

vi.mock("@/components/Utilities/SortableTableHeader", () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <th data-testid={`header-${label}`}>{label}</th>,
}));

vi.mock("@/components/FundingPlatform/ApplicationList/AIEvaluationModal", () => ({
  AIEvaluationModal: () => null,
}));

vi.mock("@/components/FundingPlatform/ApplicationList/ReviewerAssignmentDropdown", () => ({
  ReviewerAssignmentDropdown: () => <span data-testid="reviewer-dropdown" />,
}));

vi.mock("@/components/FundingPlatform/ApplicationList/TableStatusActionButtons", () => ({
  TableStatusActionButtons: () => <button type="button">Action</button>,
}));

vi.mock("@/components/FundingPlatform/helper/getAIScore", () => ({
  formatAIScore: () => "85",
}));

vi.mock("@/components/FundingPlatform/helper/getInternalAIScore", () => ({
  formatInternalAIScore: () => "90",
}));

vi.mock("@/components/FundingPlatform/helper/getProjectTitle", () => ({
  getProjectTitle: (app: { applicationData?: Record<string, string> }) =>
    app.applicationData?.projectTitle ?? "Test Project",
}));

vi.mock("@/hooks/useReviewerAssignment", () => ({
  ReviewerType: { APP: "app", MILESTONE: "milestone" },
  useReviewerAssignment: () => ({
    assignedReviewers: [],
    isAssigning: false,
    toggleReviewer: vi.fn(),
  }),
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: (d: string | Date) => String(d),
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// --- Factory -----------------------------------------------------------

import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";

const STATUSES: FundingApplicationStatusV2[] = [
  "pending",
  "under_review",
  "revision_requested",
  "approved",
  "rejected",
  "resubmitted",
];

function createMockApplication(index: number): IFundingApplication {
  const status = STATUSES[index % STATUSES.length];
  return {
    id: `id-${index}`,
    programId: "program-1",
    chainID: 1,
    applicantEmail: `applicant-${index}@example.com`,
    ownerAddress: `0x${index.toString(16).padStart(40, "0")}`,
    applicationData: { projectTitle: `Project ${index}` },
    status,
    statusHistory: [{ status, timestamp: "2025-01-01T00:00:00Z" }],
    referenceNumber: `APP-${String(index).padStart(5, "0")}-00001`,
    submissionIP: "127.0.0.1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  };
}

function generateApplications(count: number): IFundingApplication[] {
  return Array.from({ length: count }, (_, i) => createMockApplication(i));
}

// --- Component under test ----------------------------------------------

import { ApplicationTable } from "@/components/FundingPlatform/ApplicationList/ApplicationTable";

// --- Tests -------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ApplicationTable - large list rendering performance", () => {
  const DEFAULT_PROPS = {
    showAIScoreColumn: false,
    showInternalAIScoreColumn: false,
    showAppReviewersColumn: false,
    showMilestoneReviewersColumn: false,
    showStatusActions: false,
    programReviewers: [],
    milestoneReviewers: [],
    isLoadingProgramReviewers: false,
    isProgramReviewersError: false,
    isLoadingMilestoneReviewers: false,
    isMilestoneReviewersError: false,
  };

  it("renders 200 rows within the 2 000 ms budget", () => {
    const applications = generateApplications(200);

    const start = performance.now();
    const { container } = render(
      <ApplicationTable applications={applications} {...DEFAULT_PROPS} />
    );
    const elapsed = performance.now() - start;

    // Verify all rows rendered
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(200);

    // Performance assertion - generous threshold for CI environments
    expect(elapsed).toBeLessThan(2000);
  });

  it("renders 500 rows within the 5 000 ms budget", () => {
    const applications = generateApplications(500);

    const start = performance.now();
    const { container } = render(
      <ApplicationTable applications={applications} {...DEFAULT_PROPS} />
    );
    const elapsed = performance.now() - start;

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(500);

    // 500 rows should scale roughly linearly from the 200-row baseline
    expect(elapsed).toBeLessThan(5000);
  });

  it("renders with all optional columns enabled within the 3 000 ms budget", () => {
    const applications = generateApplications(200);

    const allColumnsProps = {
      ...DEFAULT_PROPS,
      showAIScoreColumn: true,
      showInternalAIScoreColumn: true,
      showAppReviewersColumn: true,
      showMilestoneReviewersColumn: true,
      showStatusActions: true,
      programReviewers: [{ id: "r1", address: "0x1", name: "Reviewer 1", programId: "p1" }],
      milestoneReviewers: [{ id: "mr1", address: "0x2", name: "MReviewer 1", programId: "p1" }],
      onStatusChange: vi.fn(),
    };

    const Wrapper = createWrapper();

    const start = performance.now();
    const { container } = render(
      <Wrapper>
        <ApplicationTable applications={applications} {...allColumnsProps} />
      </Wrapper>
    );
    const elapsed = performance.now() - start;

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(200);

    // Extra columns add overhead, so a slightly higher threshold is used
    expect(elapsed).toBeLessThan(3000);
  });

  it("rendering time scales linearly (not quadratically) with row count", () => {
    const small = generateApplications(50);
    const large = generateApplications(200);

    const startSmall = performance.now();
    render(<ApplicationTable applications={small} {...DEFAULT_PROPS} />);
    const elapsedSmall = performance.now() - startSmall;

    const startLarge = performance.now();
    render(<ApplicationTable applications={large} {...DEFAULT_PROPS} />);
    const elapsedLarge = performance.now() - startLarge;

    // With 4x the data we expect at most 6x the time (linear with overhead).
    // A quadratic regression would show 16x+ the time.
    const ratio = elapsedLarge / Math.max(elapsedSmall, 1);
    expect(ratio).toBeLessThan(8);
  });
});
