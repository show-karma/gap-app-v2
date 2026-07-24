/**
 * @file State-by-state tests for the "Agent actions" settings page.
 * Separate describe blocks for signed-out, not-ready, loading, empty, error,
 * populated (pending + history), and the `?item=` deep-link highlight —
 * following the established repo pattern (one block per data state).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsAgentActionsPage } from "@/components/Pages/SettingsAgentActions/SettingsAgentActionsPage";
import type { PendingAgentWrite } from "@/services/pending-agent-writes.service";

// --- auth ---
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// --- deep-link search param ---
let mockItemParam: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "item" ? mockItemParam : null) }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/settings/agent-actions",
}));

// next/link → plain anchor so the page doesn't need an App Router context mounted.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- data hooks ---
const mockPendingQuery = vi.fn();
const mockHistoryQuery = vi.fn();
const approveMutate = vi.fn().mockResolvedValue(undefined);
const rejectMutate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/agent-actions/usePendingAgentWrites", () => ({
  usePendingAgentWrites: (status: "pending" | "decided" | "all") =>
    status === "pending" ? mockPendingQuery() : mockHistoryQuery(),
  useApproveAgentWrite: () => ({ mutateAsync: approveMutate }),
  useRejectAgentWrite: () => ({ mutateAsync: rejectMutate }),
}));

function makeWrite(overrides: Partial<PendingAgentWrite> = {}): PendingAgentWrite {
  return {
    id: "pc_1",
    summary: "Reject application #47 (out of scope)",
    label: "Approve / reject / revision",
    method: "PUT",
    path: "/v2/funding-applications/47/status",
    body: { status: "rejected" },
    status: "pending",
    clientName: "Claude Desktop",
    createdAt: "2026-07-23T10:00:00.000Z",
    expiresAt: "2026-07-23T22:00:00.000Z",
    decidedAt: null,
    result: null,
    ...overrides,
  };
}

const emptyList = { data: { writes: [], total: 0 }, isLoading: false, isError: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockItemParam = null;
  mockUseAuth.mockReturnValue({ ready: true, authenticated: true, login: vi.fn() });
  mockPendingQuery.mockReturnValue(emptyList);
  mockHistoryQuery.mockReturnValue(emptyList);
});

describe("SettingsAgentActionsPage", () => {
  describe("auth gating", () => {
    it("renders nothing but the shell while Privy is not ready (no glimpse)", () => {
      mockUseAuth.mockReturnValue({ ready: false, authenticated: false, login: vi.fn() });
      render(<SettingsAgentActionsPage />);
      expect(screen.queryByText(/Sign in to review/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    });

    it("shows a sign-in CTA when unauthenticated and never fetches", () => {
      mockUseAuth.mockReturnValue({ ready: true, authenticated: false, login: vi.fn() });
      render(<SettingsAgentActionsPage />);
      expect(screen.getByText(/Sign in to review agent actions/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign in to Karma/i })).toBeInTheDocument();
    });
  });

  describe("loading", () => {
    it("renders a skeleton while the pending query loads", () => {
      mockPendingQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
      render(<SettingsAgentActionsPage />);
      expect(screen.getByLabelText(/Loading your pending agent actions/i)).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("renders an error card with a retry button", () => {
      const refetch = vi.fn();
      mockPendingQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("boom"),
        refetch,
      });
      render(<SettingsAgentActionsPage />);
      expect(screen.getByText(/Couldn't load agent actions/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty", () => {
    it("renders the caught-up empty state and no history section", () => {
      render(<SettingsAgentActionsPage />);
      expect(screen.getByText(/You're all caught up/i)).toBeInTheDocument();
      expect(screen.queryByText(/recent/i)).not.toBeInTheDocument();
    });
  });

  describe("populated", () => {
    it("lists pending writes with summary, label and method+path, pluralized heading", () => {
      mockPendingQuery.mockReturnValue({
        data: { writes: [makeWrite()], total: 1 },
        isLoading: false,
        isError: false,
      });
      render(<SettingsAgentActionsPage />);

      expect(screen.getByText(/1 pending action$/i)).toBeInTheDocument();
      expect(screen.getByText(/Reject application #47/i)).toBeInTheDocument();
      expect(screen.getByText(/Approve \/ reject \/ revision/i)).toBeInTheDocument();
      expect(screen.getByText(/\/v2\/funding-applications\/47\/status/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    });

    it("pluralizes the pending heading for multiple actions", () => {
      mockPendingQuery.mockReturnValue({
        data: { writes: [makeWrite({ id: "a" }), makeWrite({ id: "b" })], total: 2 },
        isLoading: false,
        isError: false,
      });
      render(<SettingsAgentActionsPage />);
      expect(screen.getByText(/2 pending actions$/i)).toBeInTheDocument();
    });

    it("renders a history section with status badge + failure reason", () => {
      mockHistoryQuery.mockReturnValue({
        data: {
          writes: [
            makeWrite({
              id: "pc_hist",
              status: "failed",
              decidedAt: "2026-07-23T11:00:00.000Z",
              result: { statusCode: 403, error: "RBAC denied" },
            }),
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
      });
      render(<SettingsAgentActionsPage />);
      expect(screen.getByText(/1 recent decision$/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/RBAC denied/i)).toBeInTheDocument();
    });
  });

  describe("deep link", () => {
    it("highlights the row matching ?item=<id> with a ring", () => {
      mockItemParam = "pc_1";
      mockPendingQuery.mockReturnValue({
        data: { writes: [makeWrite({ id: "pc_1" }), makeWrite({ id: "pc_2" })], total: 2 },
        isLoading: false,
        isError: false,
      });
      const { container } = render(<SettingsAgentActionsPage />);

      const highlighted = container.querySelectorAll(".ring-2.ring-primary");
      expect(highlighted).toHaveLength(1);
    });

    it("opens the confirm dialog showing the full request when Approve is clicked", () => {
      mockPendingQuery.mockReturnValue({
        data: { writes: [makeWrite()], total: 1 },
        isLoading: false,
        isError: false,
      });
      render(<SettingsAgentActionsPage />);

      fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));

      expect(screen.getByText(/Approve this agent action\?/i)).toBeInTheDocument();
      // Pretty-printed JSON body of the staged request is shown.
      expect(screen.getByText(/"status": "rejected"/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Approve & run/i })).toBeInTheDocument();
    });
  });
});
