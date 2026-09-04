/**
 * @file Emit-site coverage for `ask_karma_message_sent`.
 *
 * Catalog shape: `{ persona: string | null, message_index: number }`.
 *
 * `message_index` is read from the chat store's current length at send time,
 * which is what makes it a funnel signal ("how deep into the conversation did
 * they get") rather than a counter. The tests below pin that it advances with
 * the conversation, that it is 0 for the first message, and that the question
 * text itself never reaches the event.
 */

import { fireEvent, render, screen } from "@testing-library/react";

const mockTrack = vi.fn();
const mockSendMessage = vi.fn();
const mockPersona = vi.fn();

let storeState: {
  messages: unknown[];
  isStreaming: boolean;
  error: unknown;
  limitReached: boolean;
  clearMessages: () => void;
  setAgentContext: () => void;
};

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@/store/agentChat", () => ({
  useAgentChatStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock("@/hooks/useAgentStream", () => ({
  useAgentStream: () => ({
    sendMessage: mockSendMessage,
    abort: vi.fn(),
    continueLastRun: vi.fn(),
  }),
}));

vi.mock("@/src/features/ask-karma/hooks/use-ask-karma-persona", () => ({
  useAskKarmaPersona: () => mockPersona(),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({
    isWhitelabel: false,
    communitySlug: null,
    config: null,
    tenantConfig: null,
  }),
}));

vi.mock("@/utilities/pages", () => ({ PAGES: { HOME: "/" } }));
vi.mock("@/utilities/tailwind", () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(" ") }));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/src/features/ask-karma/config", () => ({
  selectAskKarmaQuestions: () => [],
}));

// Both views funnel user input through the same handler; expose it as a button
// so the test drives the real callback rather than a re-implementation.
vi.mock("@/src/features/ask-karma/components/ask-karma-start", () => ({
  AskKarmaStart: ({ onSubmit }: { onSubmit: (text: string) => void }) => (
    <button type="button" data-testid="start-send" onClick={() => onSubmit("what is karma gap?")}>
      send
    </button>
  ),
}));

vi.mock("@/src/features/ask-karma/components/ask-karma-chat", () => ({
  AskKarmaChat: ({ onSend }: { onSend: (text: string) => void }) => (
    <button type="button" data-testid="chat-send" onClick={() => onSend("follow up question")}>
      send
    </button>
  ),
}));

import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";

const config = { title: "Ask Karma", subtitle: "", questions: [] } as never;

const sentMessages = () =>
  mockTrack.mock.calls.filter(([name]) => name === "ask_karma_message_sent");

beforeEach(() => {
  vi.clearAllMocks();
  mockPersona.mockReturnValue(null);
  storeState = {
    messages: [],
    isStreaming: false,
    error: null,
    limitReached: false,
    clearMessages: vi.fn(),
    setAgentContext: vi.fn(),
  };
});

describe("AskKarmaPage analytics", () => {
  it("emits ask_karma_message_sent with message_index 0 for the first message", () => {
    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    expect(sentMessages()).toHaveLength(1);
    expect(sentMessages()[0]).toEqual([
      "ask_karma_message_sent",
      { persona: null, message_index: 0 },
    ]);
    expect(mockSendMessage).toHaveBeenCalledWith("what is karma gap?");
  });

  it("advances message_index as the conversation grows", () => {
    storeState.messages = [{ role: "user" }, { role: "assistant" }];

    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    expect(sentMessages()[0][1]).toMatchObject({ message_index: 2 });
  });

  it("carries the resolved persona when one is active", () => {
    mockPersona.mockReturnValue("grantee");

    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    expect(sentMessages()[0][1]).toMatchObject({ persona: "grantee" });
  });

  it("sends persona: null rather than omitting it when there is no persona", () => {
    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    const [, props] = sentMessages()[0];
    expect(props).toHaveProperty("persona", null);
  });

  it("never puts the question text on the event", () => {
    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    expect(JSON.stringify(sentMessages()[0])).not.toContain("what is karma gap?");
  });

  it("does not emit while a response is still streaming", () => {
    storeState.isStreaming = true;

    render(<AskKarmaPage config={config} />);
    fireEvent.click(screen.getByTestId("start-send"));

    expect(sentMessages()).toHaveLength(0);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
