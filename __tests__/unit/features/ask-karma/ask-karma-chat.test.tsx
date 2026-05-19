import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AskKarmaChat } from "@/src/features/ask-karma/components/ask-karma-chat";
import type { AskKarmaConfig } from "@/src/features/ask-karma/types";
import type { ChatMessage } from "@/store/agentChat";

vi.mock("@/src/components/ai-elements/message-response", () => ({
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

const config: AskKarmaConfig = {
  heading: "Ask us anything",
  subheading: "Sub",
  inputPlaceholder: "Ask…",
  examplesIntro: "Examples:",
  exampleQuestions: [],
  featuredTopicsHeading: "Topics",
  featuredTopics: [],
  assistantTitle: "AI Assistant",
  assistantSubtitle: "Here to help 24/7",
};

function buildMsg(overrides: Partial<ChatMessage> & Pick<ChatMessage, "id" | "role">): ChatMessage {
  return {
    content: "",
    timestamp: 0,
    ...overrides,
  };
}

beforeEach(() => {
  // jsdom doesn't implement scrollIntoView; stub it so the smooth-scroll
  // effect in AskKarmaChat doesn't throw and pollute test output.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("AskKarmaChat", () => {
  it("renders the assistant header with title, subtitle, and back button", () => {
    render(
      <AskKarmaChat
        config={config}
        messages={[]}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: "AI Assistant" })).toBeInTheDocument();
    expect(screen.getByText("Here to help 24/7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to topics/i })).toBeInTheDocument();
  });

  it("renders an empty state when there are no messages and not streaming", () => {
    render(
      <AskKarmaChat
        config={config}
        messages={[]}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/ask a question to get started/i)).toBeInTheDocument();
  });

  it("renders user and assistant messages with their respective testids", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "u1", role: "user", content: "Hi", timestamp: Date.now() }),
      buildMsg({ id: "a1", role: "assistant", content: "Hello!", timestamp: Date.now() }),
    ];
    render(
      <AskKarmaChat
        config={config}
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId("ask-karma-message-user")).toBeInTheDocument();
    expect(screen.getByTestId("ask-karma-message-assistant")).toBeInTheDocument();
    expect(screen.getByText("Hi")).toBeInTheDocument();
    // Assistant content is rendered inside the markdown component
    expect(screen.getByTestId("markdown")).toHaveTextContent("Hello!");
  });

  it("shows thinking dots when streaming with empty last assistant message", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "", timestamp: Date.now() }),
    ];
    render(
      <AskKarmaChat
        config={config}
        messages={messages}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId("thinking-dots")).toBeInTheDocument();
  });

  it("does not show thinking dots once the assistant has streamed content", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "Partial answer", timestamp: Date.now() }),
    ];
    render(
      <AskKarmaChat
        config={config}
        messages={messages}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.queryByTestId("thinking-dots")).not.toBeInTheDocument();
  });

  it("renders error alert when error is present", () => {
    render(
      <AskKarmaChat
        config={config}
        messages={[]}
        isStreaming={false}
        error="Connection failed"
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Connection failed");
  });

  it("invokes onBack when the back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <AskKarmaChat
        config={config}
        messages={[]}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={onBack}
      />
    );
    await user.click(screen.getByRole("button", { name: /back to topics/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("forwards textarea submissions to onSend", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <AskKarmaChat
        config={config}
        messages={[]}
        isStreaming={false}
        error={null}
        onSend={onSend}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");
    await user.type(textarea, "Follow-up");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("Follow-up");
  });
});
