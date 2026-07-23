/**
 * @file Regression tests for Sentry GAP-FRONTEND-1WY / GAP-FRONTEND-24S
 * @description md-editor-rt@6.4.1 reads `InputEvent.data.length` unguarded in
 * its CodeMirror `input` overlength (`maxLength`) handler. `data` is `null` by
 * spec for `deleteContentBackward`, `insertParagraph`/`insertLineBreak`,
 * `insertFromPaste` and `insertFromDrop` (common on mobile IME deletions /
 * Enter / paste), so the handler throws
 * `TypeError: Cannot read properties of null (reading 'length')` on V8
 * (GAP-FRONTEND-1WY) or `null is not an object (evaluating 'r.length')` on
 * WebKit/Safari (GAP-FRONTEND-24S) — same defect, engine-split grouping.
 *
 * The fix is `normalizeNullInputEventData` (in utils/normalize-null-input-event-data.ts), passed as
 * `onInput` to MdEditor via the `SafeMdEditor` boundary (components/Utilities/SafeMdEditor.tsx):
 * the library invokes the consumer's `onInput` with the
 * raw event BEFORE destructuring `.data`, so shadowing the null with an own
 * `""` property defuses the crash. These tests render the REAL editor
 * (md-editor-rt is intentionally NOT mocked) and drive native input events
 * with `data: null` to prove:
 *   1. the normalize function itself behaves (unit tests),
 *   2. the shim defuses the crash while preserving the overlength behavior
 *      (raw MdEditor + onInput),
 *   3. the shared MarkdownEditor wrapper (via SafeMdEditor) wires the shim (end-to-end),
 *   4. the upstream bug still exists in the pristine library (canary — when
 *      this one starts failing, upstream fixed it and the shim can go).
 *
 * See also `SafeMdEditor.test.tsx` (the boundary itself, all consumers) and
 * `CommentMarkdownInput.safety.test.tsx` (the comment box, GAP-FRONTEND-24S's
 * direct regression target).
 */

import { render, waitFor } from "@testing-library/react";
import { MdEditor } from "md-editor-rt";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { normalizeNullInputEventData } from "@/components/Utilities/utils/normalize-null-input-event-data";
import {
  dispatchInputAndCollectErrors,
  installCodeMirrorPolyfills,
  LENGTH_CRASH,
  nullDataInputTypes,
  waitForEditorContent,
} from "../../utils/codemirror-jsdom";

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
    // and its wiring in SafeMdEditor.tsx) and delete this file.
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
