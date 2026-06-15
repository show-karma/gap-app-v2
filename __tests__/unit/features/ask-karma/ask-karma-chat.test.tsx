import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AskKarmaChat } from "@/src/features/ask-karma/components/ask-karma-chat";
import type { AskKarmaConfig } from "@/src/features/ask-karma/types";
import type { ChatMessage } from "@/store/agentChat";

vi.mock("@/src/components/ai-elements/message-response", () => ({
  MessageResponse: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <div data-testid="markdown" data-mode={mode}>
      {children}
    </div>
  ),
}));

const config: AskKarmaConfig = {
  heading: "Ask Karma",
  subheading: "Sub",
  inputPlaceholder: "Ask…",
  examplesIntro: "Examples:",
  exampleQuestions: [],
  featuredTopicsHeading: "Topics",
  featuredTopics: [],
  assistantTitle: "Karma Assistant",
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
    expect(screen.getByRole("heading", { name: "Karma Assistant" })).toBeInTheDocument();
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
    expect(screen.getByTestId("ask-karma-thinking")).toBeInTheDocument();
  });

  it("keeps the thinking panel visible while streaming even after content arrives", () => {
    // Multi-turn agent: a tool runs between the first chunk of text and
    // the next; isStreaming stays true the whole time. The panel must
    // stay up so the user knows work is still happening.
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
    expect(screen.getByTestId("ask-karma-thinking")).toBeInTheDocument();
  });

  it("hides the thinking panel once streaming completes", () => {
    // Stream finished — isStreaming flipped to false. Panel goes away
    // so the bubble settles as the final answer.
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "Final answer", timestamp: Date.now() }),
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
    expect(screen.queryByTestId("ask-karma-thinking")).not.toBeInTheDocument();
  });

  it("does not render an empty bubble for an assistant placeholder", () => {
    // The stream adds the assistant message to the store with content=""
    // before tokens arrive. Without the suppression, a hollow rounded
    // bubble would stack on top of the thinking panel.
    const messages: ChatMessage[] = [
      buildMsg({ id: "u1", role: "user", content: "Hi", timestamp: Date.now() }),
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
    // User bubble still renders; assistant bubble does NOT.
    expect(screen.getByTestId("ask-karma-message-user")).toBeInTheDocument();
    expect(screen.queryByTestId("ask-karma-message-assistant")).not.toBeInTheDocument();
    // Thinking panel takes the assistant's visual slot instead.
    expect(screen.getByTestId("ask-karma-thinking")).toBeInTheDocument();
  });

  it("surfaces the configured assistant title in the thinking panel", () => {
    render(
      <AskKarmaChat
        config={{ ...config, assistantTitle: "Filecoin Assistant" }}
        messages={[buildMsg({ id: "a1", role: "assistant", content: "", timestamp: Date.now() })]}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const panel = screen.getByTestId("ask-karma-thinking");
    // Tenant override flows through to the visible name + a11y label.
    expect(panel).toHaveTextContent("Filecoin Assistant");
    expect(panel).toHaveAttribute("aria-label", "Filecoin Assistant is thinking");
    // <output> has implicit role="status" — query by role to confirm the
    // a11y semantics regardless of whether the role is set explicitly.
    expect(screen.getByRole("status")).toBe(panel);
  });

  it("renders the tool history list with status icons when tools are present", () => {
    const messages: ChatMessage[] = [
      buildMsg({
        id: "a1",
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        toolHistory: [
          { id: "tu1", name: "aggregate_grants", status: "success" },
          { id: "tu2", name: "run_sql", status: "error" },
          { id: "tu3", name: "run_sql", status: "running" },
        ],
      }),
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

    const list = screen.getByTestId("ask-karma-tool-list");
    expect(list).toBeInTheDocument();
    const rows = screen.getAllByTestId("ask-karma-tool-row");
    expect(rows).toHaveLength(3);
    // Status attribute lets a snapshot-free assertion confirm the order +
    // mapping without coupling to icon node structure.
    expect(rows[0]).toHaveAttribute("data-tool-status", "success");
    expect(rows[1]).toHaveAttribute("data-tool-status", "error");
    expect(rows[2]).toHaveAttribute("data-tool-status", "running");
    // snake_case -> "snake case" humanisation
    expect(rows[0]).toHaveTextContent("aggregate grants");
    expect(rows[1]).toHaveTextContent("run sql");
  });

  it("uses the running tool as the activity label, falling back to 'thinking…'", () => {
    const { rerender } = render(
      <AskKarmaChat
        config={config}
        messages={[buildMsg({ id: "a1", role: "assistant", content: "", timestamp: Date.now() })]}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // No tools yet → generic copy.
    expect(screen.getByTestId("ask-karma-thinking")).toHaveTextContent("thinking…");

    rerender(
      <AskKarmaChat
        config={config}
        messages={[
          buildMsg({
            id: "a1",
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            toolHistory: [{ id: "tu1", name: "run_sql", status: "running" }],
          }),
        ]}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId("ask-karma-thinking")).toHaveTextContent("running run sql…");
  });

  it("does not render the tool list when toolHistory is empty or undefined", () => {
    render(
      <AskKarmaChat
        config={config}
        messages={[buildMsg({ id: "a1", role: "assistant", content: "", timestamp: Date.now() })]}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // Thinking panel exists; tool list does NOT.
    expect(screen.getByTestId("ask-karma-thinking")).toBeInTheDocument();
    expect(screen.queryByTestId("ask-karma-tool-list")).not.toBeInTheDocument();
  });

  it("exposes the message list as a live log region (#1462)", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "u1", role: "user", content: "Question", timestamp: Date.now() }),
      buildMsg({ id: "a1", role: "assistant", content: "Answer", timestamp: Date.now() }),
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
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(log).toBeInTheDocument();
    // Completed user + assistant content is queryable inside the log.
    expect(log).toHaveTextContent("Question");
    expect(log).toHaveTextContent("Answer");
  });

  it("renders completed assistant messages in static mode (#1462)", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "Completed answer", timestamp: Date.now() }),
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
    expect(screen.getByTestId("markdown")).toHaveAttribute("data-mode", "static");
  });

  it("renders the actively streaming last assistant message in streaming mode", () => {
    const messages: ChatMessage[] = [
      buildMsg({ id: "a0", role: "assistant", content: "Earlier turn", timestamp: 1 }),
      buildMsg({ id: "a1", role: "assistant", content: "Streaming now", timestamp: 2 }),
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
    const bubbles = screen.getAllByTestId("markdown");
    // Earlier completed turn is static; only the last one streams.
    expect(bubbles[0]).toHaveAttribute("data-mode", "static");
    expect(bubbles[bubbles.length - 1]).toHaveAttribute("data-mode", "streaming");
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

  it("uses instant scroll (behavior: auto) while streaming to avoid jank", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "Streaming...", timestamp: Date.now() }),
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
    expect(scrollSpy).toHaveBeenCalled();
    const lastCallArg = scrollSpy.mock.calls.at(-1)?.[0];
    expect(lastCallArg).toMatchObject({ behavior: "auto" });
  });

  it("uses smooth scroll when not streaming", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const messages: ChatMessage[] = [
      buildMsg({ id: "a1", role: "assistant", content: "Done.", timestamp: Date.now() }),
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
    expect(scrollSpy).toHaveBeenCalled();
    const lastCallArg = scrollSpy.mock.calls.at(-1)?.[0];
    expect(lastCallArg).toMatchObject({ behavior: "smooth" });
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
