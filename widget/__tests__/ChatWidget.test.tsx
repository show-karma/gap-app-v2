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
