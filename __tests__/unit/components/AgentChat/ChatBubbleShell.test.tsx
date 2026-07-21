/**
 * Unit Tests: ChatBubbleShell placement contract
 *
 * The shell is rendered by two very different consumers: the in-app panel
 * (anchored under the navbar, trigger owned by the navbar button) and the
 * embeddable widget that runs on customers' own sites (floating button, no
 * host chrome to hang a trigger from).
 *
 * These lock that split down, because breaking the widget half is invisible
 * from inside this app.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { ChatBubbleShell, type ChatBubbleShellProps } from "@/components/AgentChat/ChatBubbleShell";
import { KARMA_ASSISTANT_PANEL_ID } from "@/components/AgentChat/panel-dom";

vi.mock("@/src/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  ConversationScrollButton: () => null,
}));

vi.mock("@/src/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("use-stick-to-bottom", () => ({
  useStickToBottomContext: () => ({ scrollToBottom: vi.fn() }),
}));

function renderShell(overrides: Partial<ChatBubbleShellProps> = {}) {
  const onToggle = vi.fn();
  const props: ChatBubbleShellProps = {
    isOpen: true,
    onToggle,
    onClear: vi.fn(),
    messages: [],
    isStreaming: false,
    error: null,
    renderMarkdown: (content) => <span>{content}</span>,
    renderInput: () => (
      // Mirrors WidgetInput's contenteditable composer closely enough for the
      // shell's focus query to find it.
      <div role="textbox" aria-label="Chat message" tabIndex={0} contentEditable />
    ),
    ...overrides,
  };
  const utils = render(<ChatBubbleShell {...props} />);
  return { ...utils, onToggle };
}

describe("ChatBubbleShell placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fab (widget default)", () => {
    it("should render its own floating toggle button", () => {
      renderShell({ isOpen: false });
      expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
    });

    it("should NOT close on Escape — the host page owns that key", () => {
      const { onToggle } = renderShell();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe("anchored (in-app)", () => {
    it("should not render a floating toggle button", () => {
      renderShell({ placement: "anchored", isOpen: false });
      expect(screen.queryByLabelText("Open chat")).not.toBeInTheDocument();
    });

    it("should expose the panel id the navbar trigger points at", () => {
      const { container } = renderShell({ placement: "anchored" });
      expect(container.querySelector(`#${KARMA_ASSISTANT_PANEL_ID}`)).toBeInTheDocument();
    });

    it("should close on Escape when focus is inside the panel", () => {
      const { onToggle } = renderShell({ placement: "anchored" });
      screen.getByRole("textbox").focus();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should ignore Escape when focus is outside the panel", () => {
      // Guards the stacked-overlay case: dismissing a dialog on top of the
      // assistant must not also close the assistant underneath it.
      const outside = document.createElement("button");
      document.body.appendChild(outside);
      const { onToggle } = renderShell({ placement: "anchored" });
      outside.focus();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onToggle).not.toHaveBeenCalled();
      outside.remove();
    });

    it("should ignore Escape once closed", () => {
      const { onToggle } = renderShell({ placement: "anchored", isOpen: false });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe("brand icon", () => {
    it("should default to the sparkles mark so embeds are not rebranded", () => {
      const { container } = renderShell();
      expect(container.querySelector(".lucide-sparkles")).toBeInTheDocument();
    });

    it("should use the override when one is supplied", () => {
      const { container } = renderShell({
        renderBrandIcon: ({ className }) => <svg className={className} data-testid="custom-mark" />,
      });
      expect(container.querySelector('[data-testid="custom-mark"]')).toBeInTheDocument();
      expect(container.querySelector(".lucide-sparkles")).not.toBeInTheDocument();
    });
  });
});
