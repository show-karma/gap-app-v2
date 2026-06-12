import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";
import { ASK_KARMA_ANIMATION } from "@/src/features/ask-karma/components/ask-karma-start";
import type { AskKarmaConfig } from "@/src/features/ask-karma/types";
import { useAgentChatStore } from "@/store/agentChat";

const mockSendMessage = vi.fn();
const mockAbort = vi.fn();

vi.mock("@/hooks/useAgentStream", () => ({
  useAgentStream: () => ({
    sendMessage: mockSendMessage,
    abort: mockAbort,
    sendConfirmation: vi.fn(),
  }),
}));

vi.mock("@/src/components/ai-elements/message-response", () => ({
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// useWhitelabel drives the page-level exit CTA target. Default to non-
// whitelabel so the explicit /community/<id> path is used; individual
// tests override via mockReturnValueOnce.
const mockUseWhitelabel = vi.fn(() => ({ isWhitelabel: false }));
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => mockUseWhitelabel(),
}));

// Persona resolution hits useAuth + a React Query permission check; stub it
// so the page test stays focused on view transitions and the exit CTA. The
// persona → prompt mapping is covered in use-ask-karma-persona.test.tsx and
// config.test.ts.
vi.mock("@/src/features/ask-karma/hooks/use-ask-karma-persona", () => ({
  useAskKarmaPersona: () => "grantee",
}));

const config: AskKarmaConfig = {
  heading: "Ask Karma",
  subheading: "Sub",
  inputPlaceholder: "Ask…",
  examplesIntro: "Examples:",
  // Keep this short so the chip → fly → type sequence completes in tests
  // without burning seconds of timer advancement per assertion.
  exampleQuestions: ["Hi?"],
  featuredTopicsHeading: "Topics",
  featuredTopics: [],
  assistantTitle: "Karma Assistant",
  assistantSubtitle: "Here to help 24/7",
};

const VIEW_LEAVE_MS = 220; // matches FADE_OUT_MS in ask-karma-page.tsx

// Walk the chip → fly → type → submit sequence in phases. React state
// updates fire useEffects that schedule the next timer, so we have to flush
// between phases — see comment in ask-karma-start.test.tsx for full details.
async function advanceChipFlow(text: string): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.FLY_DURATION_MS + 20);
  });
  for (let i = 0; i < text.length; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.TYPE_SPEED_MS);
    });
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.POST_TYPE_PAUSE_MS + 30);
  });
}

function resetStore() {
  useAgentChatStore.setState({
    messages: [],
    isOpen: false,
    isStreaming: false,
    error: null,
    agentContext: null,
    pendingMentions: [],
    pendingTraceId: null,
    ratingCommentBoxOpenForMessageId: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AskKarmaPage", () => {
  it("renders the start view by default", () => {
    render(<AskKarmaPage config={config} />);
    expect(screen.getByTestId("ask-karma-start-view")).toBeInTheDocument();
    expect(screen.queryByTestId("ask-karma-chat-view")).not.toBeInTheDocument();
  });

  it("clears messages and sets the agent context to the community on mount", () => {
    useAgentChatStore.setState({
      messages: [{ id: "x", role: "user", content: "stale", timestamp: 0 }],
      agentContext: { projectId: "other" },
    });
    render(<AskKarmaPage config={config} communityId="filecoin" />);
    expect(useAgentChatStore.getState().messages).toHaveLength(0);
    expect(useAgentChatStore.getState().agentContext).toEqual({ communityId: "filecoin" });
  });

  it("sets the agent context to null when rendered without a communityId", () => {
    render(<AskKarmaPage config={config} />);
    expect(useAgentChatStore.getState().agentContext).toBeNull();
  });

  it("transitions to the chat view after a chip is clicked", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaPage config={config} />);

    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));

    // Walk the chip animation so the start view actually calls onSubmit.
    await advanceChipFlow(config.exampleQuestions[0]);

    expect(mockSendMessage).toHaveBeenCalledWith(config.exampleQuestions[0]);
    expect(screen.getByTestId("ask-karma-start-view")).toHaveAttribute(
      "data-view-state",
      "leaving-start"
    );

    // After the parent's fade-out (220ms), the chat view replaces the start view.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEW_LEAVE_MS + 30);
    });
    expect(screen.queryByTestId("ask-karma-start-view")).not.toBeInTheDocument();
    expect(screen.getByTestId("ask-karma-chat-view")).toBeInTheDocument();
  });

  it("aborts and returns to the start view when the back button is clicked", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaPage config={config} />);

    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    await advanceChipFlow(config.exampleQuestions[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEW_LEAVE_MS + 30);
    });
    expect(screen.getByTestId("ask-karma-chat-view")).toBeInTheDocument();

    act(() => {
      useAgentChatStore.setState({
        messages: [{ id: "u1", role: "user", content: "Hi", timestamp: Date.now() }],
      });
    });

    await user.click(screen.getByRole("button", { name: /back to topics/i }));
    expect(mockAbort).toHaveBeenCalled();
    expect(screen.getByTestId("ask-karma-chat-view")).toHaveAttribute(
      "data-view-state",
      "leaving-chat"
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEW_LEAVE_MS + 30);
    });
    expect(screen.queryByTestId("ask-karma-chat-view")).not.toBeInTheDocument();
    expect(screen.getByTestId("ask-karma-start-view")).toBeInTheDocument();
    expect(useAgentChatStore.getState().messages).toHaveLength(0);
  });

  it("does not send empty submissions", async () => {
    const user = userEvent.setup();
    render(<AskKarmaPage config={config} />);
    const input = screen.getByPlaceholderText(config.inputPlaceholder);
    await user.type(input, "   ");
    await user.keyboard("{Enter}");
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("ask-karma-start-view")).toBeInTheDocument();
  });

  it("aborts and clears state on unmount", () => {
    const { unmount } = render(<AskKarmaPage config={config} communityId="filecoin" />);
    act(() => {
      useAgentChatStore.setState({
        messages: [{ id: "x", role: "user", content: "leftover", timestamp: 0 }],
        agentContext: { communityId: "filecoin" },
      });
    });
    unmount();
    expect(mockAbort).toHaveBeenCalled();
    expect(useAgentChatStore.getState().messages).toHaveLength(0);
    expect(useAgentChatStore.getState().agentContext).toBeNull();
  });

  it("locks pointer events and marks aria-hidden on the start view during fade-out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaPage config={config} />);

    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    await advanceChipFlow(config.exampleQuestions[0]);

    const startView = screen.getByTestId("ask-karma-start-view");
    expect(startView).toHaveAttribute("data-view-state", "leaving-start");
    expect(startView).toHaveAttribute("aria-hidden", "true");
    // pointer-events-none class is what blocks click forwarding in the
    // browser; assert it so a refactor that drops it gets caught.
    expect(startView.className).toContain("pointer-events-none");
  });

  it("does not trigger another view transition when already in chat", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaPage config={config} />);

    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    await advanceChipFlow(config.exampleQuestions[0]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEW_LEAVE_MS + 30);
    });
    expect(screen.getByTestId("ask-karma-chat-view")).toHaveAttribute("data-view-state", "chat");

    // Send a follow-up while already in chat — state should remain "chat",
    // sendMessage should still be invoked. Follow-ups skip the chip
    // animation; they hit sendMessage immediately.
    mockSendMessage.mockClear();
    const textarea = screen.getByPlaceholderText("Type your message...");
    await user.type(textarea, "Follow-up");
    await user.keyboard("{Enter}");
    expect(mockSendMessage).toHaveBeenCalledWith("Follow-up");
    expect(screen.getByTestId("ask-karma-chat-view")).toHaveAttribute("data-view-state", "chat");
  });

  describe("Go to community view CTA", () => {
    beforeEach(() => {
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: false });
    });

    it("renders on the start view and points at /community/<id> on the main domain", () => {
      render(<AskKarmaPage config={config} communityId="filecoin" />);
      // CTA is at page level — present immediately, before any view switch.
      expect(screen.getByTestId("ask-karma-start-view")).toBeInTheDocument();
      const cta = screen.getByTestId("ask-karma-go-to-community");
      expect(cta).toHaveAttribute("href", "/community/filecoin");
      expect(cta).toHaveTextContent("Go to community view");
    });

    it("stays present after transitioning to the chat view", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<AskKarmaPage config={config} communityId="filecoin" />);

      await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
      await advanceChipFlow(config.exampleQuestions[0]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(VIEW_LEAVE_MS + 30);
      });

      expect(screen.getByTestId("ask-karma-chat-view")).toBeInTheDocument();
      // Same CTA, same href — survives the crossfade.
      expect(screen.getByTestId("ask-karma-go-to-community")).toHaveAttribute(
        "href",
        "/community/filecoin"
      );
    });

    it("points at site root on a whitelabel surface", () => {
      // Use the persistent override (not mockReturnValueOnce) because
      // testing-library + React 18 may invoke the hook more than once
      // during a single render, and we want every call within this test
      // to report whitelabel mode.
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: true });
      render(<AskKarmaPage config={config} communityId="filecoin" />);
      expect(screen.getByTestId("ask-karma-go-to-community")).toHaveAttribute("href", "/");
    });

    it("falls back to site root when no community is in scope", () => {
      render(<AskKarmaPage config={config} />);
      expect(screen.getByTestId("ask-karma-go-to-community")).toHaveAttribute("href", "/");
    });
  });
});
