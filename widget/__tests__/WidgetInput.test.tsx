import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatMention } from "@/store/agentChat";
import { __test, WidgetInput } from "../WidgetInput";

const { serializeEditor, buildMentionChip, insertMentionAtCaret, isEditorEmpty } = __test;

const milestoneMention: ChatMention = {
  id: "milestone-abc",
  kind: "milestone",
  label: "Milestone 1 from Fund#2",
  refText: 'milestone "Milestone 1" in project "Fund#2"',
};

const secondMention: ChatMention = {
  id: "milestone-def",
  kind: "milestone",
  label: "Milestone 2",
  refText: 'milestone "Milestone 2"',
};

function makeEditor(): HTMLDivElement {
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  document.body.appendChild(editor);
  return editor;
}

function placeCaretAtEnd(editor: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe("WidgetInput helpers", () => {
  describe("buildMentionChip", () => {
    it("creates a contenteditable=false span with @-prefixed label", () => {
      const chip = buildMentionChip(milestoneMention);
      expect(chip.contentEditable).toBe("false");
      expect(chip.textContent).toBe("@Milestone 1 from Fund#2");
      expect(chip.getAttribute("data-mention")).toBe("milestone-abc");
      expect(chip.getAttribute("data-mention-ref-text")).toBe(milestoneMention.refText);
    });
  });

  describe("isEditorEmpty", () => {
    it("returns true for null editor", () => {
      expect(isEditorEmpty(null)).toBe(true);
    });

    it("returns true for empty editor", () => {
      const editor = makeEditor();
      expect(isEditorEmpty(editor)).toBe(true);
    });

    it("returns false when editor has text", () => {
      const editor = makeEditor();
      editor.textContent = "hi";
      expect(isEditorEmpty(editor)).toBe(false);
    });

    it("returns false when editor has only a mention chip", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      expect(isEditorEmpty(editor)).toBe(false);
    });
  });

  describe("insertMentionAtCaret", () => {
    it("appends a chip when caret is not inside the editor", () => {
      const editor = makeEditor();
      window.getSelection()?.removeAllRanges();
      insertMentionAtCaret(editor, milestoneMention);
      expect(editor.querySelector("[data-mention]")?.textContent).toBe("@Milestone 1 from Fund#2");
    });

    it("inserts at caret when caret is inside the editor", () => {
      const editor = makeEditor();
      editor.textContent = "hello world";
      const range = document.createRange();
      range.setStart(editor.firstChild as Node, 5);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      insertMentionAtCaret(editor, milestoneMention);
      const chip = editor.querySelector("[data-mention]");
      expect(chip).not.toBeNull();
    });
  });

  describe("serializeEditor", () => {
    it("returns plain text", () => {
      const editor = makeEditor();
      editor.textContent = "Hello agent";
      expect(serializeEditor(editor)).toBe("Hello agent");
    });

    it("substitutes chip refText for chip nodes", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      editor.appendChild(document.createTextNode(" what's the status?"));
      expect(serializeEditor(editor)).toBe(
        'milestone "Milestone 1" in project "Fund#2" what\'s the status?'
      );
    });

    it("returns refText only when no typed text follows", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      expect(serializeEditor(editor)).toBe('milestone "Milestone 1" in project "Fund#2"');
    });

    it("preserves multiple chips in order", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      editor.appendChild(document.createTextNode(" and "));
      editor.appendChild(buildMentionChip(secondMention));
      editor.appendChild(document.createTextNode(" — compare"));
      expect(serializeEditor(editor)).toBe(
        'milestone "Milestone 1" in project "Fund#2" and milestone "Milestone 2" — compare'
      );
    });

    it("converts <br> to newline", () => {
      const editor = makeEditor();
      editor.appendChild(document.createTextNode("line one"));
      editor.appendChild(document.createElement("br"));
      editor.appendChild(document.createTextNode("line two"));
      expect(serializeEditor(editor)).toBe("line one\nline two");
    });

    it("trims surrounding whitespace", () => {
      const editor = makeEditor();
      editor.textContent = "   hi   ";
      expect(serializeEditor(editor)).toBe("hi");
    });
  });
});

describe("WidgetInput", () => {
  function getEditor() {
    return screen.getByRole("textbox", { name: /chat message/i });
  }

  it("calls onSubmit with typed text and clears the editor", async () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);
    const editor = getEditor();
    editor.focus();
    placeCaretAtEnd(editor);
    await userEvent.type(editor, "Hello agent");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSubmit).toHaveBeenCalledWith("Hello agent");
    expect(editor.textContent).toBe("");
  });

  it("disables send button when editor is empty", () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("marks editor non-editable while streaming", () => {
    render(<WidgetInput onSubmit={vi.fn()} isStreaming={true} onStop={vi.fn()} />);
    const editor = getEditor();
    expect(editor.getAttribute("contenteditable")).toBe("false");
    expect(editor).toHaveAttribute("aria-disabled", "true");
  });

  it("shows stop button while streaming", async () => {
    const onStop = vi.fn();
    render(<WidgetInput onSubmit={vi.fn()} isStreaming={true} onStop={onStop} />);
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(onStop).toHaveBeenCalled();
  });

  it("submits on Enter (without Shift)", async () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);
    const editor = getEditor();
    editor.focus();
    placeCaretAtEnd(editor);
    await userEvent.type(editor, "Hello");
    fireEvent.keyDown(editor, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("Hello");
  });

  describe("mention chips", () => {
    it("renders an inline @-prefixed chip for each mention", () => {
      const onMentionsConsumed = vi.fn();
      render(
        <WidgetInput
          onSubmit={vi.fn()}
          isStreaming={false}
          mentions={[milestoneMention]}
          onMentionsConsumed={onMentionsConsumed}
        />
      );
      // StrictMode may fire the drain effect twice; both insert chips with the
      // same label. The host clears the queue in response to onMentionsConsumed
      // so the steady-state UI shows however many chips the producer pushed.
      expect(screen.getAllByText("@Milestone 1 from Fund#2").length).toBeGreaterThanOrEqual(1);
      expect(onMentionsConsumed).toHaveBeenCalled();
    });

    it("submits message with chip refText substituted inline", async () => {
      const onSubmit = vi.fn();
      const onMentionsConsumed = vi.fn();
      render(
        <WidgetInput
          onSubmit={onSubmit}
          isStreaming={false}
          mentions={[milestoneMention]}
          onMentionsConsumed={onMentionsConsumed}
        />
      );
      const editor = getEditor();
      editor.focus();
      placeCaretAtEnd(editor);
      await userEvent.type(editor, "what's the status?");
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      const sent = onSubmit.mock.calls[0][0] as string;
      expect(sent).toContain('milestone "Milestone 1" in project "Fund#2"');
      expect(sent).toContain("what's the status?");
    });

    it("can submit with only a mention and no typed text", async () => {
      const onSubmit = vi.fn();
      render(<WidgetInput onSubmit={onSubmit} isStreaming={false} mentions={[milestoneMention]} />);
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
      expect(onSubmit).toHaveBeenCalledWith('milestone "Milestone 1" in project "Fund#2"');
    });
  });
});
