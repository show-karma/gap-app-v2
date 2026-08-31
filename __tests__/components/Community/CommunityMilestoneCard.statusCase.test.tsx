/**
 * The indexer emits milestone `status` verbatim and mixed-case rows exist, so
 * an exact-match `=== "completed"` comparison rendered delivered work as
 * pending: a Clock icon, a live "Due" line and no completion block.
 *
 * Kept out of CommunityMilestoneCard.test.tsx because that file is already at
 * the test-file size cap.
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";

vi.mock("@/components/Shared/ActivityCard/styles", () => ({
  containerClassName: "border rounded-xl",
}));

vi.mock("@/components/Shared/ActivityCard/ActivityAttribution", () => ({
  ActivityAttribution: ({ date, isCompleted }: { date?: string; isCompleted?: boolean }) => (
    <div data-testid="activity-attribution">
      <span data-testid="attribution-date">{date}</span>
      <span data-testid="attribution-completed">{isCompleted ? "true" : "false"}</span>
    </div>
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/utilities/ReadMore", () => ({
  ReadMore: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Keep real exports (normalizeTimestamp backs milestoneDueDate's normalizer).
vi.mock("@/utilities/formatDate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utilities/formatDate")>()),
  formatDate: vi.fn((d: string) => new Date(d).toISOString()),
}));

vi.mock("@/components/Pages/Community/Updates/MilestoneCompletionInfo", () => ({
  MilestoneCompletionInfo: ({ completionReason }: { completionReason?: string }) => (
    <div data-testid="milestone-completion-info">{completionReason}</div>
  ),
}));

vi.mock("@/components/Milestone/MilestoneAIEvaluationBadge", () => ({
  MilestoneAIEvaluationBadge: () => <div data-testid="milestone-ai-evaluation-badge" />,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  ClockIcon: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className} />
  ),
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { CommunityMilestoneCard } from "@/components/Pages/Community/Updates/CommunityMilestoneCard";

const pastDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const futureDate = (daysAhead: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
};

// Minimal duplicate of the factory in CommunityMilestoneCard.test.tsx —
// duplicated rather than exported, so neither file grows for the other's sake.
const createMockMilestone = (
  overrides: Partial<CommunityMilestoneUpdate> = {}
): CommunityMilestoneUpdate => ({
  uid: "milestone-123",
  communityUID: "community-456",
  status: "pending",
  details: {
    title: "Test Milestone",
    description: "This is a test milestone description",
    dueDate: futureDate(30),
  },
  project: {
    uid: "project-789",
    details: { data: { title: "Test Project", slug: "test-project" } },
  },
  grant: {
    uid: "grant-abc",
    programId: "program-123",
    details: { data: { title: "Test Grant Program" } },
  },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z",
  ...overrides,
});

const withStatus = (status: string) => status as CommunityMilestoneUpdate["status"];

describe("CommunityMilestoneCard mixed-case status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it.each(["COMPLETED", "Completed", "VERIFIED"])(
    "renders %s exactly like a lowercase completed milestone",
    (status) => {
      const milestone = createMockMilestone({
        status: withStatus(status),
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: pastDate(10),
          completionReason: "Successfully delivered all features",
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("clock-icon")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Due /)).not.toBeInTheDocument();
      expect(screen.getByTestId("attribution-completed")).toHaveTextContent("true");
      expect(screen.getByTestId("attribution-date")).toHaveTextContent("2025-01-15T00:00:00.000Z");
      expect(screen.getByTestId("milestone-completion-info")).toBeInTheDocument();
    }
  );

  it.each([
    ["COMPLETED", "Completed"],
    ["VERIFIED", "Verified"],
    ["CANCELLED", "Cancelled"],
    ["PENDING", "Pending"],
  ])("resolves a styled %s badge labelled %s", (status, label) => {
    const milestone = createMockMilestone({ status: withStatus(status) });

    render(<CommunityMilestoneCard milestone={milestone} />);

    const badge = screen.getByText(label).closest("div");
    expect(badge?.className).toContain("bg-");
  });

  it("keeps an uppercase PENDING past-due milestone pending-shaped", () => {
    const milestone = createMockMilestone({
      status: withStatus("PENDING"),
      details: { title: "Test Milestone", description: "Description", dueDate: pastDate(10) },
    });

    render(<CommunityMilestoneCard milestone={milestone} />);

    expect(screen.getByText("Past Due")).toBeInTheDocument();
    expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    expect(screen.getByTestId("attribution-completed")).toHaveTextContent("false");
  });
});
