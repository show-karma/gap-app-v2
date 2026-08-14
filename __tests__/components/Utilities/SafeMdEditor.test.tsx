/**
 * @file Regression tests for Sentry GAP-FRONTEND-24S
 * @description `SafeMdEditor` (components/Utilities/SafeMdEditor.tsx) is the
 * single app boundary allowed to render md-editor-rt directly. It normalizes
 * `InputEvent.data` (null for Backspace/Enter/paste, see
 * GAP-FRONTEND-1WY/GAP-FRONTEND-24S) before the library's `maxLength`
 * overlength check runs, and defaults `value` to `""`. These tests render the
 * REAL editor through `SafeMdEditor` (md-editor-rt is intentionally NOT
 * mocked) to prove the boundary itself — independent of which wrapper
 * (`MarkdownEditor`, `CommentMarkdownInput`) consumes it — is safe.
 */

import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SafeMdEditor } from "@/components/Utilities/SafeMdEditor";
import {
  dispatchInputAndCollectErrors,
  installCodeMirrorPolyfills,
  LENGTH_CRASH,
  nullDataInputTypes,
  waitForEditorContent,
} from "../../utils/codemirror-jsdom";

vi.mock("md-editor-rt/lib/style.css", () => ({}));

// Replace next/dynamic with a shim that actually lazy-loads the REAL module,
// so SafeMdEditor renders the genuine md-editor-rt editor in jsdom.
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

describe("SafeMdEditor (GAP-FRONTEND-24S)", () => {
  beforeEach(() => {
    installCodeMirrorPolyfills();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(nullDataInputTypes)(
    "does not throw a length TypeError for inputType=%s with data:null",
    async (inputType) => {
      const utils = render(
        <SafeMdEditor
          value="existing content"
          onChange={() => {}}
          maxLength={100}
          preview={false}
          language="en-US"
        />
      );
      const content = await waitForEditorContent(utils.container as HTMLElement);

      const errors = dispatchInputAndCollectErrors(content, { data: null, inputType });

      expect(errors.filter((message) => LENGTH_CRASH.test(message))).toEqual([]);
    }
  );

  it("still emits an overlength error when the input pushes past maxLength", async () => {
    const onError = vi.fn();
    const utils = render(
      <SafeMdEditor
        value=""
        onChange={() => {}}
        maxLength={100}
        onError={onError}
        preview={false}
        language="en-US"
      />
    );
    const content = await waitForEditorContent(utils.container as HTMLElement);

    dispatchInputAndCollectErrors(content, {
      data: "x".repeat(200),
      inputType: "insertText",
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: "overlength" }));
    });
  });

  it("composes with a consumer onInput instead of clobbering it", async () => {
    const consumerOnInput = vi.fn();
    const utils = render(
      <SafeMdEditor
        value="existing content"
        onChange={() => {}}
        onInput={consumerOnInput}
        maxLength={100}
        preview={false}
        language="en-US"
      />
    );
    const content = await waitForEditorContent(utils.container as HTMLElement);

    dispatchInputAndCollectErrors(content, {
      data: null,
      inputType: "deleteContentBackward",
    });

    expect(consumerOnInput).toHaveBeenCalled();
    // The consumer receives the already-normalized event: the null was
    // shadowed with "" before onInput ran.
    const receivedEvent = consumerOnInput.mock.calls[0]?.[0] as InputEvent;
    expect(receivedEvent.data).toBe("");
  });

  it("renders an undefined value as an empty string without crashing", async () => {
    const utils = render(
      <SafeMdEditor
        value={undefined}
        onChange={() => {}}
        maxLength={100}
        preview={false}
        language="en-US"
      />
    );

    await waitForEditorContent(utils.container as HTMLElement);
    // No throw during mount is the assertion; md-editor-rt renders an empty
    // CodeMirror document for value="".
  });
});
