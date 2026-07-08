/**
 * @file Regression test for Sentry GAP-FRONTEND-1WY
 * @description md-editor-rt@6.4.1 reads `InputEvent.data.length` unguarded in
 * its CodeMirror `input`/`paste` overlength (`maxLength`) handler. `data` is
 * `null` by spec for `deleteContentBackward`, `insertParagraph`/
 * `insertLineBreak`, `insertFromPaste` and `insertFromDrop` (common on mobile
 * IME deletions / Enter / paste), so the handler throws
 * `TypeError: Cannot read properties of null (reading 'length')`.
 *
 * The fix lives in patches/md-editor-rt@6.4.1.patch (pnpm patch). This test
 * renders the REAL editor (md-editor-rt is intentionally NOT mocked) and drives
 * native input events with `data: null` to prove the crash is gone while the
 * overlength behaviour is preserved.
 */

import { render, waitFor } from "@testing-library/react";
import { MdEditor } from "md-editor-rt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// CodeMirror-in-jsdom polyfills. CodeMirror 6 measures the DOM on mount and on
// every input; jsdom implements none of these, so without them the editor
// throws while laying out rather than exercising the code path under test.
// ---------------------------------------------------------------------------
function installCodeMirrorPolyfills() {
  const emptyRect = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      }) as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => emptyRect;
  }
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
  }
}

/**
 * Dispatches a native `input` InputEvent on the CodeMirror content DOM and
 * returns every error surfaced through any channel (a thrown listener, the
 * window `error` event, or CodeMirror's `logException` → console.error).
 */
function dispatchInputAndCollectErrors(
  content: Element,
  init: { data: string | null; inputType: string }
): string[] {
  const errors: string[] = [];

  const onWindowError = (event: ErrorEvent) => {
    errors.push(String(event.error?.message ?? event.message ?? ""));
  };
  window.addEventListener("error", onWindowError);
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
  });

  try {
    content.dispatchEvent(
      new InputEvent("input", { data: init.data, inputType: init.inputType, bubbles: true })
    );
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    window.removeEventListener("error", onWindowError);
    consoleErrorSpy.mockRestore();
  }

  return errors;
}

const LENGTH_CRASH = /Cannot read properties of null|reading 'length'|reading "length"/;

describe("MarkdownEditor / md-editor-rt null InputEvent.data (GAP-FRONTEND-1WY)", () => {
  beforeEach(() => {
    installCodeMirrorPolyfills();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderEditor(props: {
    value?: string;
    maxLength: number;
    onError?: (err: { name: string; message: string }) => void;
  }) {
    const utils = render(
      <MdEditor
        editorId="null-input-event-test"
        value={props.value ?? ""}
        onChange={() => {}}
        maxLength={props.maxLength}
        onError={props.onError}
        preview={false}
        language="en-US"
      />
    );

    // Wait for CodeMirror to mount its content DOM.
    let content: Element | null = null;
    await waitFor(
      () => {
        content = utils.container.querySelector(".cm-content");
        expect(content).not.toBeNull();
      },
      { timeout: 5000 }
    );

    return { ...utils, content: content as unknown as Element };
  }

  // Each of these inputTypes produces a native InputEvent whose `.data` is
  // `null` per the Input Events spec — the exact events that crashed in prod.
  // Note: the library's separate paste (clipboard) handler guard is covered by
  // the pattern-integrity test (md-editor-rt-patch.test.ts) only — its sole
  // nullable operand is `modelValue`, which the wrapper's `safeValue` prevents.
  const nullDataInputTypes = [
    "deleteContentBackward",
    "insertLineBreak",
    "insertFromPaste",
    "insertFromDrop",
  ];

  it.each(nullDataInputTypes)(
    "does not throw a length TypeError for inputType=%s with data:null",
    async (inputType) => {
      const { content } = await renderEditor({ value: "existing content", maxLength: 100 });

      const errors = dispatchInputAndCollectErrors(content, { data: null, inputType });

      expect(errors.filter((message) => LENGTH_CRASH.test(message))).toEqual([]);
    }
  );

  it("still emits an overlength error when the input pushes past maxLength", async () => {
    const onError = vi.fn();
    const { content } = await renderEditor({ value: "", maxLength: 100, onError });

    dispatchInputAndCollectErrors(content, {
      data: "x".repeat(200),
      inputType: "insertText",
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: "overlength" }));
    });
  });
});
