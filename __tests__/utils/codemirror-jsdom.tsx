/**
 * Shared jsdom helpers for rendering the REAL md-editor-rt (CodeMirror-backed)
 * editor in tests and driving native InputEvents against it.
 *
 * Extracted from the original GAP-FRONTEND-1WY regression suite
 * (`__tests__/components/Utilities/MarkdownEditor.nullInputEvent.test.tsx`) so
 * the same helpers can be reused by `SafeMdEditor.test.tsx` and
 * `CommentMarkdownInput.safety.test.tsx` for GAP-FRONTEND-24S.
 */
import { waitFor } from "@testing-library/react";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// CodeMirror-in-jsdom polyfills. CodeMirror 6 measures the DOM on mount and on
// every input; jsdom implements none of these, so without them the editor
// throws while laying out rather than exercising the code path under test.
// ---------------------------------------------------------------------------
export function installCodeMirrorPolyfills() {
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
 * window `error` event, or CodeMirror's logException -> console.error).
 */
export function dispatchInputAndCollectErrors(
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

// Matches both the V8 phrasing (`Cannot read properties of null (reading
// 'length')`, what jsdom always produces) and the WebKit/Safari phrasing
// (`null is not an object (evaluating 'r.length')`, GAP-FRONTEND-24S) in
// case a future test environment or transcript surfaces the WebKit wording
// verbatim. jsdom itself only ever produces the V8 message today.
export const LENGTH_CRASH =
  /Cannot read properties of null|reading 'length'|reading "length"|null is not an object|evaluating '[a-zA-Z0-9_$]*\.length'/;

/** Waits for CodeMirror to mount its content DOM inside the given container. */
export async function waitForEditorContent(container: HTMLElement): Promise<Element> {
  let content: Element | null = null;
  await waitFor(
    () => {
      content = container.querySelector(".cm-content");
      expect(content).not.toBeNull();
    },
    { timeout: 5000 }
  );
  return content as unknown as Element;
}

// Each of these inputTypes produces a native InputEvent whose `.data` is
// `null` per the Input Events spec — the exact events that crashed in prod.
// Note: the library's separate paste (clipboard) handler's only nullable
// operand is `modelValue`, which `SafeMdEditor`'s `value ?? ""` already
// prevents.
export const nullDataInputTypes = [
  "deleteContentBackward",
  "insertLineBreak",
  "insertFromPaste",
  "insertFromDrop",
];
