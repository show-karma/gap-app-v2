/**
 * @file Regression tests for Sentry GAP-FRONTEND-1WY
 * @description md-editor-rt@6.4.1 reads `InputEvent.data.length` unguarded in
 * its CodeMirror `input` overlength (`maxLength`) handler. `data` is `null` by
 * spec for `deleteContentBackward`, `insertParagraph`/`insertLineBreak`,
 * `insertFromPaste` and `insertFromDrop` (common on mobile IME deletions /
 * Enter / paste), so the handler throws
 * `TypeError: Cannot read properties of null (reading 'length')`.
 *
 * The fix is `normalizeNullInputEventData` (in utils/normalize-null-input-event-data.ts), passed as
 * `onInput` to MdEditor: the library invokes the consumer's `onInput` with the
 * raw event BEFORE destructuring `.data`, so shadowing the null with an own
 * `""` property defuses the crash. These tests render the REAL editor
 * (md-editor-rt is intentionally NOT mocked) and drive native input events
 * with `data: null` to prove:
 *   1. the normalize function itself behaves (unit tests),
 *   2. the shim defuses the crash while preserving the overlength behavior
 *      (raw MdEditor + onInput),
 *   3. the shared MarkdownEditor wrapper wires the shim (end-to-end),
 *   4. the upstream bug still exists in the pristine library (canary — when
 *      this one starts failing, upstream fixed it and the shim can go).
 */

import { render, waitFor } from "@testing-library/react";
import { MdEditor } from "md-editor-rt";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { normalizeNullInputEventData } from "@/components/Utilities/utils/normalize-null-input-event-data";

// The wrapper pulls in next-themes and a heavy preview component — mock those
// (NOT md-editor-rt itself, which is the code under test).
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("md-editor-rt/lib/style.css", () => ({}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

// Replace next/dynamic with a shim that actually lazy-loads the REAL module,
// so the wrapper renders the genuine md-editor-rt editor in jsdom.
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (importFn: () => Promise<React.ComponentType>) => {
    const Lazy = React.lazy(async () => {
      const component = await importFn();
      return { default: component };
    });
    const DynamicShim = (props: Record<string, unknown>) => (
      <React.Suspense fallback={null}>
        <Lazy {...props} />
      </React.Suspense>
    );
    return DynamicShim;
  },
}));

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
 * window `error` event, or CodeMirror's logException -> console.error).
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

/** Waits for CodeMirror to mount its content DOM inside the given container. */
async function waitForEditorContent(container: HTMLElement): Promise<Element> {
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
// operand is `modelValue`, which the wrapper's `safeValue` already prevents.
const nullDataInputTypes = [
  "deleteContentBackward",
  "insertLineBreak",
  "insertFromPaste",
  "insertFromDrop",
];

describe("normalizeNullInputEventData (GAP-FRONTEND-1WY)", () => {
  it("jsdom matches browsers: InputEvent.data is a prototype getter, null by default", () => {
    const event = new InputEvent("input", { data: null, inputType: "deleteContentBackward" });
    expect(event.data).toBeNull();
    // No own property — `data` lives on the prototype, so an own value
    // property can shadow it (the mechanism the shim relies on).
    expect(Object.getOwnPropertyDescriptor(event, "data")).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(InputEvent.prototype, "data")?.get).toBeTypeOf(
      "function"
    );
  });

  it('rewrites null data to an own "" property', () => {
    const event = new InputEvent("input", { data: null, inputType: "deleteContentBackward" });
    normalizeNullInputEventData(event);
    expect(event.data).toBe("");
    expect(Object.getOwnPropertyDescriptor(event, "data")?.value).toBe("");
  });

  it("leaves non-null data untouched", () => {
    const event = new InputEvent("input", { data: "abc", inputType: "insertText" });
    normalizeNullInputEventData(event);
    expect(event.data).toBe("abc");
    // Still the prototype getter — no own property was added.
    expect(Object.getOwnPropertyDescriptor(event, "data")).toBeUndefined();
  });

  it("does not disturb the rest of the event", () => {
    const event = new InputEvent("input", {
      data: null,
      inputType: "insertLineBreak",
      bubbles: true,
    });
    normalizeNullInputEventData(event);
    expect(event.inputType).toBe("insertLineBreak");
    expect(event.type).toBe("input");
    expect(event.bubbles).toBe(true);
  });
});

describe("MarkdownEditor / md-editor-rt null InputEvent.data (GAP-FRONTEND-1WY)", () => {
  beforeEach(() => {
    installCodeMirrorPolyfills();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shim mechanism (raw MdEditor + onInput normalize)", () => {
    async function renderShimmedEditor(props: {
      value?: string;
      maxLength: number;
      onError?: (err: { name: string; message: string }) => void;
    }) {
      const utils = render(
        <MdEditor
          editorId="shimmed-editor-test"
          value={props.value ?? ""}
          onChange={() => {}}
          onInput={normalizeNullInputEventData}
          maxLength={props.maxLength}
          onError={props.onError}
          preview={false}
          language="en-US"
        />
      );
      const content = await waitForEditorContent(utils.container as HTMLElement);
      return { ...utils, content };
    }

    it.each(nullDataInputTypes)(
      "does not throw a length TypeError for inputType=%s with data:null",
      async (inputType) => {
        const { content } = await renderShimmedEditor({
          value: "existing content",
          maxLength: 100,
        });

        const errors = dispatchInputAndCollectErrors(content, { data: null, inputType });

        expect(errors.filter((message) => LENGTH_CRASH.test(message))).toEqual([]);
      }
    );

    it("still emits an overlength error when the input pushes past maxLength", async () => {
      const onError = vi.fn();
      const { content } = await renderShimmedEditor({ value: "", maxLength: 100, onError });

      dispatchInputAndCollectErrors(content, {
        data: "x".repeat(200),
        inputType: "insertText",
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: "overlength" }));
      });
    });
  });

  describe("MarkdownEditor wrapper wires the shim (end-to-end)", () => {
    it.each(nullDataInputTypes)(
      "does not throw a length TypeError for inputType=%s with data:null",
      async (inputType) => {
        const utils = render(
          <MarkdownEditor value="existing content" onChange={() => {}} maxLength={100} />
        );
        const content = await waitForEditorContent(utils.container as HTMLElement);

        const errors = dispatchInputAndCollectErrors(content, { data: null, inputType });

        expect(errors.filter((message) => LENGTH_CRASH.test(message))).toEqual([]);
      }
    );
  });

  describe("upstream bug canary (pristine library, NO shim)", () => {
    // Documents that md-editor-rt still crashes without the shim. If this
    // test starts FAILING after a library upgrade, upstream fixed the null
    // guard: remove `normalizeNullInputEventData` (utils/normalize-null-input-event-data.ts
    // and its wiring in MarkdownEditor.tsx) and delete this file.
    it("unshimmed editor still throws the length TypeError on data:null", async () => {
      const utils = render(
        <MdEditor
          editorId="unshimmed-editor-test"
          value="existing content"
          onChange={() => {}}
          maxLength={100}
          preview={false}
          language="en-US"
        />
      );
      const content = await waitForEditorContent(utils.container as HTMLElement);

      const errors = dispatchInputAndCollectErrors(content, {
        data: null,
        inputType: "deleteContentBackward",
      });

      expect(errors.some((message) => LENGTH_CRASH.test(message))).toBe(true);
    });
  });
});
