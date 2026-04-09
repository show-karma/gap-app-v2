import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentChatBubble } from "@/components/AgentChat/AgentChatBubble";
import { useAgentChatStore } from "@/store/agentChat";

// Mock useAuth
const mockAuthenticated = vi.fn(() => true);
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: mockAuthenticated() }),
}));

// Mock useAgentStream
const mockSendMessage = vi.fn();
const mockSendConfirmation = vi.fn();
const mockAbort = vi.fn();
vi.mock("@/hooks/useAgentStream", () => ({
  useAgentStream: () => ({
    sendMessage: mockSendMessage,
    sendConfirmation: mockSendConfirmation,
    abort: mockAbort,
  }),
}));

// Mock useAgentContextSync
vi.mock("@/hooks/useAgentContextSync", () => ({
  useAgentContextSync: vi.fn(),
}));

// Mock AI Elements components to simple div/form renderers for unit testing
vi.mock("@/src/components/ai-elements/conversation", () => ({
  Conversation: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="conversation" className={className}>
      {children}
    </div>
  ),
  ConversationContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="conversation-content" className={className}>
      {children}
    </div>
  ),
  ConversationEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
    icon?: React.ReactNode;
  }) => (
    <div data-testid="conversation-empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  ConversationScrollButton: () => <button data-testid="scroll-button">Scroll</button>,
}));

vi.mock("@/src/components/ai-elements/message", () => ({
  Message: ({ children, from }: { children: React.ReactNode; from: string }) => (
    <div data-testid={`message-${from}`}>{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
  MessageActions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-actions">{children}</div>
  ),
  MessageAction: ({
    children,
    onClick,
    tooltip,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }) => (
    <button data-testid="message-action" onClick={onClick} title={tooltip}>
      {children}
    </button>
  ),
}));

vi.mock("@/src/components/ai-elements/message-response", () => ({
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-response">{children}</div>
  ),
}));

// WidgetInput is now used by AgentChatBubble — mock the InputGroup primitives it renders
vi.mock("@/components/ui/input-group", () => ({
  InputGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="input-group">{children}</div>
  ),
  InputGroupTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea data-testid="prompt-textarea" {...props} />
  ),
  InputGroupAddon: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
    const { variant, size, ...rest } = props as Record<string, unknown>;
    return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
  },
}));

// Mock use-stick-to-bottom
vi.mock("use-stick-to-bottom", () => ({
  useStickToBottomContext: () => ({
    scrollToBottom: vi.fn(),
    isAtBottom: true,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertCircleIcon: () => <span data-testid="icon-alert-circle" />,
  BotIcon: () => <span data-testid="icon-bot" />,
  CopyIcon: () => <span data-testid="icon-copy" />,
  CornerDownLeftIcon: () => <span data-testid="icon-corner-down-left" />,
  MessageSquareIcon: () => <span data-testid="icon-message-square" />,
  SparklesIcon: () => <span data-testid="icon-sparkles" />,
  SquareIcon: () => <span data-testid="icon-square" />,
  Trash2Icon: () => <span data-testid="icon-trash" />,
  UserIcon: () => <span data-testid="icon-user" />,
  XIcon: () => <span data-testid="icon-x" />,
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
    const { variant, size, asChild, isLoading, ...rest } = props as Record<string, unknown>;
    return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
  },
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

describe("AgentChatBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated.mockReturnValue(true);
    // Reset store state
    useAgentChatStore.setState({
      messages: [],
      isOpen: false,
      isStreaming: false,
      error: null,
      agentContext: null,
    });
  });

  it("should still render toggle when unauthenticated", () => {
    mockAuthenticated.mockReturnValue(false);
    render(<AgentChatBubble />);
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });

  it("should render toggle button when authenticated", () => {
    render(<AgentChatBubble />);
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });

  it("should have panel hidden (aria-hidden) when closed", () => {
    render(<AgentChatBubble />);
    const panel = screen.getByRole("dialog", { hidden: true });
    expect(panel).toHaveAttribute("aria-hidden", "true");
    // Conversation should not be mounted when closed
    expect(screen.queryByTestId("conversation")).not.toBeInTheDocument();
  });

  it("should have panel visible (aria-hidden=false) when open", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Karma Assistant")).toBeInTheDocument();
    expect(screen.getByTestId("conversation")).toBeInTheDocument();
  });

  it("should toggle chat on button click", async () => {
    const user = userEvent.setup();
    render(<AgentChatBubble />);
    await user.click(screen.getByLabelText("Open chat"));
    // After click, store.toggleOpen is called → isOpen becomes true
    expect(useAgentChatStore.getState().isOpen).toBe(true);
  });

  it("should show empty state when no messages", () => {
    useAgentChatStore.setState({ isOpen: true, messages: [] });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("conversation-empty-state")).toBeInTheDocument();
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("should render messages using AI Elements Message components", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        { id: "1", role: "user", content: "Hello", timestamp: Date.now() },
        {
          id: "2",
          role: "assistant",
          content: "Hi there!",
          timestamp: Date.now(),
        },
      ],
    });
    render(<AgentChatBubble />);

    expect(screen.getByTestId("message-user")).toBeInTheDocument();
    expect(screen.getByTestId("message-assistant")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("should render avatars next to messages", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        { id: "1", role: "user", content: "Hello", timestamp: Date.now() },
        { id: "2", role: "assistant", content: "Hi!", timestamp: Date.now() },
      ],
    });
    render(<AgentChatBubble />);

    const avatars = screen.getAllByTestId("avatar");
    expect(avatars.length).toBeGreaterThanOrEqual(2);
  });

  it("should render copy action for non-streaming assistant messages", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Response text",
          timestamp: Date.now(),
          isStreaming: false,
        },
      ],
    });
    render(<AgentChatBubble />);
    expect(screen.getByTitle("Copy")).toBeInTheDocument();
  });

  it("should not render copy action for streaming messages", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Streaming...",
          timestamp: Date.now(),
          isStreaming: true,
        },
      ],
    });
    render(<AgentChatBubble />);
    expect(screen.queryByTestId("message-actions")).not.toBeInTheDocument();
  });

  it("should show thinking dots while streaming with empty content", () => {
    useAgentChatStore.setState({
      isOpen: true,
      isStreaming: true,
      messages: [{ id: "1", role: "assistant", content: "", timestamp: Date.now() }],
    });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("thinking-dots")).toBeInTheDocument();
  });

  it("should display error message", () => {
    useAgentChatStore.setState({
      isOpen: true,
      error: "Connection failed",
    });
    render(<AgentChatBubble />);
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("should render confirmation card for preview tool results", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Here is the preview",
          timestamp: Date.now(),
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { name: "New Name" },
            status: "pending",
          },
        },
      ],
    });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("confirmation-card")).toBeInTheDocument();
  });

  it("should call sendMessage when submitting text", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);

    const textarea = screen.getByTestId("prompt-textarea");
    await user.clear(textarea);
    await user.type(textarea, "Test message{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith("Test message");
  });

  it("should not submit empty messages", async () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);

    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).toBeDisabled();
  });

  it("should show stop button when streaming", () => {
    useAgentChatStore.setState({ isOpen: true, isStreaming: true });
    render(<AgentChatBubble />);
    expect(screen.getByLabelText("Stop generating")).toBeInTheDocument();
  });

  it("should call abort when stop button clicked", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({ isOpen: true, isStreaming: true });
    render(<AgentChatBubble />);

    await user.click(screen.getByLabelText("Stop generating"));
    expect(mockAbort).toHaveBeenCalled();
  });

  it("should show context badge when agentContext has projectId", () => {
    useAgentChatStore.setState({
      isOpen: true,
      agentContext: { projectId: "proj-1" },
    });
    render(<AgentChatBubble />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("should show context badge for programId", () => {
    useAgentChatStore.setState({
      isOpen: true,
      agentContext: { programId: "prog-1" },
    });
    render(<AgentChatBubble />);
    expect(screen.getByText("Program")).toBeInTheDocument();
  });

  it("should show context badge for applicationId", () => {
    useAgentChatStore.setState({
      isOpen: true,
      agentContext: { applicationId: "app-1" },
    });
    render(<AgentChatBubble />);
    expect(screen.getByText("Application")).toBeInTheDocument();
  });

  it("should clear messages when Clear button clicked", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({
      isOpen: true,
      messages: [{ id: "1", role: "user", content: "Hello", timestamp: Date.now() }],
    });
    render(<AgentChatBubble />);

    await user.click(screen.getByTitle("Clear chat"));
    expect(useAgentChatStore.getState().messages).toHaveLength(0);
  });

  it("should render scroll-to-bottom button", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("scroll-button")).toBeInTheDocument();
  });

  it("should call sendConfirmation when approving a preview", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Preview",
          timestamp: Date.now(),
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { name: "New" },
            status: "pending",
          },
        },
      ],
    });
    render(<AgentChatBubble />);

    await user.click(screen.getByTestId("confirm-approve"));
    expect(mockSendConfirmation).toHaveBeenCalledWith("msg-1", "preview_update_project", true);
  });

  it("should call sendConfirmation when denying a preview", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({
      isOpen: true,
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Preview",
          timestamp: Date.now(),
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { name: "New" },
            status: "pending",
          },
        },
      ],
    });
    render(<AgentChatBubble />);

    await user.click(screen.getByTestId("confirm-deny"));
    expect(mockSendConfirmation).toHaveBeenCalledWith("msg-1", "preview_update_project", false);
  });
});
