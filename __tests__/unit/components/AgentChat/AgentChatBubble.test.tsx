import { fireEvent, render, screen } from "@testing-library/react";
import { AgentChatBubble } from "@/components/AgentChat/AgentChatBubble";
import { useAgentChatStore } from "@/store/agentChat";

// Mock useAuth
const mockAuthenticated = jest.fn(() => true);
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: mockAuthenticated() }),
}));

// Mock useAgentStream
const mockSendMessage = jest.fn();
const mockSendConfirmation = jest.fn();
const mockAbort = jest.fn();
jest.mock("@/hooks/useAgentStream", () => ({
  useAgentStream: () => ({
    sendMessage: mockSendMessage,
    sendConfirmation: mockSendConfirmation,
    abort: mockAbort,
  }),
}));

// Mock useAgentContextSync
jest.mock("@/hooks/useAgentContextSync", () => ({
  useAgentContextSync: jest.fn(),
}));

// Mock AI Elements components to simple div/form renderers for unit testing
jest.mock("@/src/components/ai-elements/conversation", () => ({
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

jest.mock("@/src/components/ai-elements/message", () => ({
  Message: ({ children, from }: { children: React.ReactNode; from: string }) => (
    <div data-testid={`message-${from}`}>{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-response">{children}</div>
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

jest.mock("@/src/components/ai-elements/prompt-input", () => ({
  PromptInput: ({
    children,
    onSubmit,
  }: {
    children: React.ReactNode;
    onSubmit: (msg: { text: string; files: unknown[] }) => void;
  }) => (
    <form
      data-testid="prompt-input"
      onSubmit={(e) => {
        e.preventDefault();
        const textarea = e.currentTarget.querySelector("textarea");
        onSubmit({ text: textarea?.value ?? "", files: [] });
      }}
    >
      {children}
    </form>
  ),
  PromptInputTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea data-testid="prompt-textarea" {...props} />
  ),
  PromptInputSubmit: ({
    status,
    onStop,
    disabled,
  }: {
    status?: string;
    onStop?: () => void;
    disabled?: boolean;
  }) =>
    status === "streaming" ? (
      <button data-testid="stop-button" type="button" onClick={onStop}>
        Stop
      </button>
    ) : (
      <button data-testid="submit-button" type="submit" disabled={disabled}>
        Send
      </button>
    ),
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="prompt-footer">{children}</div>
  ),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  MessageSquare: () => <span data-testid="icon-message-square" />,
  CopyIcon: () => <span data-testid="icon-copy" />,
}));

describe("AgentChatBubble", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("should not render when unauthenticated", () => {
    mockAuthenticated.mockReturnValue(false);
    const { container } = render(<AgentChatBubble />);
    expect(container.innerHTML).toBe("");
  });

  it("should render toggle button when authenticated", () => {
    render(<AgentChatBubble />);
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });

  it("should not render chat panel when closed", () => {
    render(<AgentChatBubble />);
    expect(screen.queryByTestId("conversation")).not.toBeInTheDocument();
  });

  it("should render chat panel when open", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("conversation")).toBeInTheDocument();
    expect(screen.getByText("GAP Assistant")).toBeInTheDocument();
  });

  it("should toggle chat on button click", () => {
    render(<AgentChatBubble />);
    fireEvent.click(screen.getByLabelText("Open chat"));
    // After click, store.toggleOpen is called → isOpen becomes true
    expect(useAgentChatStore.getState().isOpen).toBe(true);
  });

  it("should show empty state when no messages", () => {
    useAgentChatStore.setState({ isOpen: true, messages: [] });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("conversation-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
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
    expect(screen.getByTestId("message-actions")).toBeInTheDocument();
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

  it("should show thinking indicator while streaming with empty content", () => {
    useAgentChatStore.setState({
      isOpen: true,
      isStreaming: true,
      messages: [{ id: "1", role: "assistant", content: "", timestamp: Date.now() }],
    });
    render(<AgentChatBubble />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
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

  it("should call sendMessage when submitting text", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);

    const textarea = screen.getByTestId("prompt-textarea");
    fireEvent.change(textarea, { target: { value: "Test message" } });

    const form = screen.getByTestId("prompt-input");
    fireEvent.submit(form);

    expect(mockSendMessage).toHaveBeenCalledWith("Test message");
  });

  it("should not submit empty messages", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);

    const form = screen.getByTestId("prompt-input");
    fireEvent.submit(form);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("should show stop button when streaming", () => {
    useAgentChatStore.setState({ isOpen: true, isStreaming: true });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("should call abort when stop button clicked", () => {
    useAgentChatStore.setState({ isOpen: true, isStreaming: true });
    render(<AgentChatBubble />);

    fireEvent.click(screen.getByTestId("stop-button"));
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

  it("should clear messages when Clear button clicked", () => {
    useAgentChatStore.setState({
      isOpen: true,
      messages: [{ id: "1", role: "user", content: "Hello", timestamp: Date.now() }],
    });
    render(<AgentChatBubble />);

    fireEvent.click(screen.getByTitle("Clear chat"));
    expect(useAgentChatStore.getState().messages).toHaveLength(0);
  });

  it("should render scroll-to-bottom button", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<AgentChatBubble />);
    expect(screen.getByTestId("scroll-button")).toBeInTheDocument();
  });

  it("should call sendConfirmation when approving a preview", () => {
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

    fireEvent.click(screen.getByTestId("confirm-approve"));
    expect(mockSendConfirmation).toHaveBeenCalledWith("msg-1", "preview_update_project", true);
  });

  it("should call sendConfirmation when denying a preview", () => {
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

    fireEvent.click(screen.getByTestId("confirm-deny"));
    expect(mockSendConfirmation).toHaveBeenCalledWith("msg-1", "preview_update_project", false);
  });
});
