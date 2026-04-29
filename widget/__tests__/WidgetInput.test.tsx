import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatMention } from "@/store/agentChat";
import { __test, WidgetInput } from "../WidgetInput";

const { serializeEditor, buildMentionChip, insertMentionAtCaret, isEditorEmpty } = __test;

const milestoneMention: ChatMention = {
  id: "milestone-abc",
  kind: "milestone",
  label: "Milestone 1 from Fund#2",
  primaryId: "0xmilestone-uid",
  parentSlug: "fund-2",
};

const milestoneToken =
  "@[Milestone 1 from Fund#2](mention:milestone:0xmilestone-uid?project=fund-2)";

const secondMention: ChatMention = {
  id: "milestone-def",
  kind: "milestone",
  label: "Milestone 2",
  primaryId: "0xmilestone-uid-2",
};

const secondToken = "@[Milestone 2](mention:milestone:0xmilestone-uid-2)";

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
    it("creates a contenteditable=false span with @-prefixed label and stamped attrs", () => {
      const chip = buildMentionChip(milestoneMention);
      expect(chip.contentEditable).toBe("false");
      expect(chip.textContent).toBe("@Milestone 1 from Fund#2");
      expect(chip.getAttribute("data-mention")).toBe("milestone-abc");
      expect(chip.getAttribute("data-mention-kind")).toBe("milestone");
      expect(chip.getAttribute("data-mention-primary-id")).toBe("0xmilestone-uid");
      expect(chip.getAttribute("data-mention-parent-slug")).toBe("fund-2");
      expect(chip.getAttribute("data-mention-label")).toBe("Milestone 1 from Fund#2");
    });

    it("omits parent-slug attr when not provided", () => {
      const chip = buildMentionChip(secondMention);
      expect(chip.hasAttribute("data-mention-parent-slug")).toBe(false);
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

    it("substitutes mention token for chip nodes", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      editor.appendChild(document.createTextNode(" what's the status?"));
      expect(serializeEditor(editor)).toBe(`${milestoneToken} what's the status?`);
    });

    it("returns token only when no typed text follows", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      expect(serializeEditor(editor)).toBe(milestoneToken);
    });

    it("preserves multiple chips in order", () => {
      const editor = makeEditor();
      editor.appendChild(buildMentionChip(milestoneMention));
      editor.appendChild(document.createTextNode(" and "));
      editor.appendChild(buildMentionChip(secondMention));
      editor.appendChild(document.createTextNode(" — compare"));
      expect(serializeEditor(editor)).toBe(`${milestoneToken} and ${secondToken} — compare`);
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

    it("replaces non-breaking spaces (U+00A0) with regular spaces", () => {
      // contenteditable browsers insert real NBSP characters for trailing
      // spaces and multi-space runs; the AI backend should receive plain ASCII.
      const editor = makeEditor();
      editor.textContent = "hello\u00A0world\u00A0\u00A0!";
      expect(serializeEditor(editor)).toBe("hello world  !");
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

    it("submits message with chip token substituted inline", async () => {
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
      expect(sent).toContain(milestoneToken);
      expect(sent).toContain("what's the status?");
    });

    it("can submit with only a mention and no typed text", async () => {
      const onSubmit = vi.fn();
      render(<WidgetInput onSubmit={onSubmit} isStreaming={false} mentions={[milestoneMention]} />);
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
      expect(onSubmit).toHaveBeenCalledWith(milestoneToken);
    });

    it("skips chips whose id already exists in the editor on a re-push", () => {
      // Repro for the "click the @-mention button twice" bug: after the host
      // clears its queue via onMentionsConsumed and re-pushes the same
      // mention, we must NOT add a second chip with the same id.
      const onMentionsConsumed = vi.fn();
      const { rerender } = render(
        <WidgetInput
          onSubmit={vi.fn()}
          isStreaming={false}
          mentions={[milestoneMention]}
          onMentionsConsumed={onMentionsConsumed}
        />
      );
      const firstCount = document.querySelectorAll('[data-mention="milestone-abc"]').length;
      expect(firstCount).toBeGreaterThanOrEqual(1);

      rerender(
        <WidgetInput
          onSubmit={vi.fn()}
          isStreaming={false}
          mentions={[milestoneMention]}
          onMentionsConsumed={onMentionsConsumed}
        />
      );

      expect(document.querySelectorAll('[data-mention="milestone-abc"]').length).toBe(firstCount);
    });
  });

  it("clears stray <br>s left by contenteditable so the placeholder reappears", () => {
    render(<WidgetInput onSubmit={vi.fn()} isStreaming={false} />);
    const editor = getEditor();

    // Mimic what browsers leave after the user types a char and deletes it.
    editor.appendChild(document.createElement("br"));
    expect(editor.childNodes.length).toBe(1);

    fireEvent.input(editor);

    expect(editor.childNodes.length).toBe(0);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });
});
