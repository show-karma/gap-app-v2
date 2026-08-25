import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAgentChatStore } from "@/store/agentChat";
import { ChatWidget } from "../ChatWidget";

// Mock the streaming hook
vi.mock("../useWidgetStream", () => ({
  useWidgetStream: () => ({
    sendMessage: vi.fn(),
    abort: vi.fn(),
  }),
  abortWidgetStream: vi.fn(),
}));

// Mock use-stick-to-bottom — jsdom doesn't support scroll/resize measurements
vi.mock("use-stick-to-bottom", () => ({
  StickToBottom: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  useStickToBottomContext: () => ({
    isAtBottom: true,
    scrollToBottom: vi.fn(),
  }),
}));

// Mock WidgetMarkdown to avoid streamdown setup
vi.mock("../WidgetMarkdown", () => ({
  WidgetMarkdown: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="widget-markdown">{children}</div>
  ),
}));

// Mock shared AI elements
vi.mock("@/src/components/ai-elements/conversation", () => ({
  Conversation: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className}>{children}</div>
  ),
  ConversationContent: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className}>{children}</div>
  ),
  ConversationEmptyState: ({ title, description }: { title?: string; description?: string }) => (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
  ConversationScrollButton: () => null,
}));

vi.mock("@/src/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  useAgentChatStore.getState().clearMessages();
  useAgentChatStore.getState().setOpen(false);
});

describe("ChatWidget", () => {
  const defaultProps = {
    apiUrl: "https://test.api/v2/agent/stream",
    communityId: "filecoin",
  };

  it("renders the toggle button", () => {
    render(<ChatWidget {...defaultProps} />);
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
  });

  it("opens chat panel on toggle click", async () => {
    render(<ChatWidget {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/how can i help/i)).toBeInTheDocument();
  });

  it("renders without auth gate — always visible", () => {
    render(<ChatWidget {...defaultProps} />);
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
  });

  it("shows custom title in header", async () => {
    render(<ChatWidget {...defaultProps} title="Filecoin Grants Assistant" />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(screen.getByText("Filecoin Grants Assistant")).toBeInTheDocument();
  });

  it("shows communityId in empty state description", async () => {
    render(<ChatWidget {...defaultProps} communityId="optimism" />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(screen.getByText(/optimism grants/i)).toBeInTheDocument();
  });
});

describe("ChatWidget notice", () => {
  /**
   * The disclaimer a host shows when it has no session to pass, so a visitor
   * knows the answers are general before acting on one.
   */
  const defaultProps = {
    apiUrl: "https://test.api/v2/agent/stream",
    communityId: "filecoin",
  };

  const openPanel = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open chat" }));
  };

  it("shows nothing when the host supplies no notice", async () => {
    render(<ChatWidget {...defaultProps} />);
    await openPanel();

    expect(screen.queryByText(/answers here are general/i)).not.toBeInTheDocument();
  });

  it("shows the host's text", async () => {
    render(<ChatWidget {...defaultProps} notice={{ text: "Answers here are general." }} />);
    await openPanel();

    expect(screen.getByText(/answers here are general/i)).toBeInTheDocument();
  });

  it("renders the action as a link out, when the host gives one", async () => {
    render(
      <ChatWidget
        {...defaultProps}
        notice={{
          text: "Answers here are general.",
          actionLabel: "Ask in the app",
          actionHref: "https://app.filpgf.io/ask-karma",
        }}
      />
    );
    await openPanel();

    const link = screen.getByRole("link", { name: "Ask in the app" });
    expect(link).toHaveAttribute("href", "https://app.filpgf.io/ask-karma");
    // Opens away from the host page, and without handing it a live opener.
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the text without a link when only a label is given", async () => {
    // Half a link is not a link — it would render as unclickable text.
    render(
      <ChatWidget {...defaultProps} notice={{ text: "General answers.", actionLabel: "Sign in" }} />
    );
    await openPanel();

    expect(screen.getByText(/general answers/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
