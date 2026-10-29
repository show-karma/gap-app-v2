import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlackUserConnectCard } from "@/components/Pages/Admin/SlackOauth/SlackUserConnectCard";
import type { SlackUserConnection } from "@/types/slack-oauth";

const mocks = vi.hoisted(() => ({
  useSlackUserConnections: vi.fn(),
  useStartSlackUserConnect: vi.fn(),
  useDisconnectSlackUser: vi.fn(),
  useStartSlackInstall: vi.fn(),
}));

vi.mock("@/hooks/useSlackOauth", () => ({
  useSlackUserConnections: mocks.useSlackUserConnections,
  useStartSlackUserConnect: mocks.useStartSlackUserConnect,
  useDisconnectSlackUser: mocks.useDisconnectSlackUser,
  useStartSlackInstall: mocks.useStartSlackInstall,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function createMockConnection(overrides: Partial<SlackUserConnection> = {}): SlackUserConnection {
  return {
    teamId: "T123",
    teamName: "Karma",
    slackUserId: "U_ME",
    connectedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function setQuery(state: { isLoading?: boolean; error?: Error; data?: SlackUserConnection[] }) {
  mocks.useSlackUserConnections.mockReturnValue({
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    data: state.data,
    refetch: vi.fn(),
  });
}

describe("SlackUserConnectCard", () => {
  const start = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStartSlackUserConnect.mockReturnValue({ mutate: start, isPending: false });
    mocks.useStartSlackInstall.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useDisconnectSlackUser.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  describe("loading", () => {
    it("renders a spinner while connections load", () => {
      setQuery({ isLoading: true });

      render(<SlackUserConnectCard communitySlug="karma" />);

      expect(screen.getByText("Your Slack account")).toBeInTheDocument();
      expect(screen.queryByText(/Not connected/)).not.toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("offers a retry when the query fails", () => {
      const refetch = vi.fn();
      mocks.useSlackUserConnections.mockReturnValue({
        isLoading: false,
        error: new Error("boom"),
        data: undefined,
        refetch,
      });

      render(<SlackUserConnectCard communitySlug="karma" />);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("empty", () => {
    it("starts the user connect flow from the Connect my Slack button", () => {
      setQuery({ data: [] });

      render(<SlackUserConnectCard communitySlug="karma" />);
      fireEvent.click(screen.getByRole("button", { name: "Connect your Slack account" }));

      expect(screen.getByText(/Not connected/)).toBeInTheDocument();
      expect(start).toHaveBeenCalled();
    });
  });

  describe("populated", () => {
    it("lists each connected workspace with a disconnect action", () => {
      setQuery({
        data: [
          createMockConnection(),
          createMockConnection({ teamId: "T999", teamName: "Probelab" }),
        ],
      });

      render(<SlackUserConnectCard communitySlug="karma" />);

      expect(screen.getByText("Karma")).toBeInTheDocument();
      expect(screen.getByText("Probelab")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /disconnect/i })).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Connect another workspace" })).toBeInTheDocument();
    });

    it("disables the confirm dialog while the disconnect is pending", () => {
      setQuery({ data: [createMockConnection()] });
      mocks.useDisconnectSlackUser.mockReturnValue({ mutateAsync: vi.fn(), isPending: true });

      render(<SlackUserConnectCard communitySlug="karma" />);
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog)
          .getAllByRole("button")
          .some((b) => b.hasAttribute("disabled"))
      ).toBe(true);
    });
  });
});
