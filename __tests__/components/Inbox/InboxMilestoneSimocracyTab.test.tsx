import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseFundingApplicationByProjectUID = vi.fn();
const mockUseApplicationIntegrations = vi.fn();
const mockUseSimocracyComments = vi.fn();
const mockUsePermissionContext = vi.fn();

vi.mock("@/hooks/useFundingApplicationByProjectUID", () => ({
  useFundingApplicationByProjectUID: (...args: unknown[]) =>
    mockUseFundingApplicationByProjectUID(...args),
}));
vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useApplicationIntegrations: (...args: unknown[]) => mockUseApplicationIntegrations(...args),
  useSimocracyComments: (...args: unknown[]) => mockUseSimocracyComments(...args),
  useSimocracyProgramSummary: () => ({ data: undefined }),
  useSimocracyCouncil: () => ({
    data: [
      {
        simUri: "at://did:plc:host/org.simocracy.sim/s1",
        simName: "S1",
        avatar: "https://img.test/s1.png",
        ownerDid: "did:plc:host",
      },
    ],
  }),
  useSimocracyFeedback: () => ({ data: [] }),
  useSubmitSimocracyFeedback: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "0xadmin" }),
}));

import { InboxMilestoneSimocracyTab } from "@/components/Inbox/InboxMilestoneSimocracyTab";

const MILESTONE = { uid: "0xMS1", title: "Dashboard MVP" };

function comment(id: string, authorName: string, text: string, milestoneUid: string | null) {
  return {
    commentUri: `at://did:plc:host/org.impactindexer.review.comment/${id}`,
    authorDid: "did:plc:host",
    authorSimUri: `at://did:plc:host/org.simocracy.sim/${id}`,
    authorName,
    text,
    referenceNumber: "APP-1",
    proposalUri: "at://did:plc:host/org.hypercerts.claim.activity/p1",
    parentCommentUri: null,
    milestoneUid,
    createdAt: "2026-09-22T10:00:00.000Z",
  };
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<InboxMilestoneSimocracyTab projectUID="proj-1" milestone={MILESTONE} />, {
    wrapper,
  });
}

describe("InboxMilestoneSimocracyTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissionContext.mockReturnValue({ isCommunityAdmin: false, isLoading: false });
    mockUseFundingApplicationByProjectUID.mockReturnValue({
      application: { referenceNumber: "APP-1" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseApplicationIntegrations.mockReturnValue({
      data: [{ key: "simocracy", enabled: true }],
      isLoading: false,
    });
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [], forbidden: false },
      isLoading: false,
    });
  });

  it("says so when the program has no Simocracy integration", () => {
    mockUseApplicationIntegrations.mockReturnValue({ data: [], isLoading: false });

    renderTab();

    expect(screen.getByText(/Simocracy is not connected/)).toBeInTheDocument();
  });

  it("says so when the milestone has no funding application", () => {
    mockUseFundingApplicationByProjectUID.mockReturnValue({
      application: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderTab();

    expect(screen.getByText(/not tied to a funding application/)).toBeInTheDocument();
    expect(mockUseApplicationIntegrations).toHaveBeenCalledWith("");
  });

  it("shows only this milestone's verdicts, matched by uid or by the milestone line", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: {
        forbidden: false,
        comments: [
          comment("s1", "S1", "Milestone: Dashboard MVP\n\nDemonstrated — shipped.", "0xms1"),
          comment("s2", "S2", "Milestone: Dashboard MVP\n\nPartially demonstrated.", null),
          comment("s3", "S3", "Milestone: Audit\n\nNot demonstrated.", "0xother"),
          comment("s4", "S4", "I don't ballot from the proposal alone.", null),
        ],
      },
      isLoading: false,
    });

    renderTab();

    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("S2")).toBeInTheDocument();
    expect(screen.queryByText("S3")).not.toBeInTheDocument();
    expect(screen.queryByText("S4")).not.toBeInTheDocument();
    expect(screen.queryByText(/Milestone: Dashboard MVP/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Represented faithfully" })
    ).not.toBeInTheDocument();
  });

  it("shows the Sim's council avatar next to its name when the council has one", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: {
        programId: "1013",
        forbidden: false,
        comments: [
          comment("s1", "S1", "Milestone: Dashboard MVP\n\nDemonstrated.", "0xms1"),
          comment("s2", "S2", "Milestone: Dashboard MVP\n\nPartially.", "0xms1"),
        ],
      },
      isLoading: false,
    });

    const { container } = renderTab();

    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("offers feedback controls to community admins", () => {
    mockUsePermissionContext.mockReturnValue({ isCommunityAdmin: true, isLoading: false });
    mockUseSimocracyComments.mockReturnValue({
      data: {
        forbidden: false,
        comments: [comment("s1", "S1", "Milestone: Dashboard MVP\n\nDemonstrated.", "0xms1")],
      },
      isLoading: false,
    });

    renderTab();

    expect(screen.getAllByRole("button", { name: "Represented faithfully" })).toHaveLength(1);
  });

  it("shows an empty note when no Sim has evaluated this milestone", () => {
    renderTab();

    expect(screen.getByText(/No Sim evaluations for this milestone yet/)).toBeInTheDocument();
  });
});
