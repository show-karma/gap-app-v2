/**
 * @file Regression test for Sentry issue 7853602321 (React #185, "Maximum update
 * depth exceeded") on the application edit page.
 *
 * md-editor-rt@6.4.1 runs `useEffect(() => setState(o => ({ ...o,
 * buildFinished: false })), [value, modelValue])` inside its save hook. The
 * updater always returns a new object, so React never bails out of it.
 *
 * A keystroke is a discrete event, so the RHF update it causes commits on the
 * SyncLane, and React flushes that commit's passive effects synchronously. The
 * effect above therefore leaves a Default-lane update pending at the end of
 * every keystroke commit. When keys arrive faster than React gets a task to
 * render that Default update — a snippet expander or dictation tool typing a
 * character per millisecond, which is what the Sentry replay shows — every
 * keystroke commit ends with work still pending. React counts each one as a
 * nested update and throws #185 on the 51st, from whichever setState comes
 * next: RHF's useWatch in the Controller. RHF's onChange is async, so it
 * surfaces as an unhandled rejection, exactly as in production.
 *
 * The burst below reproduces that: each character is a transaction dispatched
 * inside a discrete `keydown` listener (so React assigns the SyncLane), and
 * only microtasks run between characters, so React never gets a macrotask to
 * render the Default-lane work.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Button } from "@/components/ui/button";
import {
  getEditorView,
  installCodeMirrorPolyfills,
  waitForEditorContent,
} from "../../utils/codemirror-jsdom";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("md-editor-rt/lib/style.css", () => ({}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

// Load the REAL md-editor-rt: the defect lives in its effects.
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

// Longer than React's nested-update limit (50).
const BURST = "- typed by a snippet tool that sends one character every millisecond, no pause";

type FormValues = { notes: string };

/** The application form's textarea wiring: a Controller feeding MarkdownEditor. */
function ControlledMarkdownField({
  onFormValue,
  onRejection,
}: {
  onFormValue: (value: string) => void;
  onRejection: (error: unknown) => void;
}) {
  const { control, watch, reset } = useForm<FormValues>({ defaultValues: { notes: "" } });

  React.useEffect(() => {
    const { unsubscribe } = watch((values) => onFormValue(values.notes ?? ""));
    return unsubscribe;
  }, [watch, onFormValue]);

  return (
    <>
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <MarkdownEditor
            id="notes"
            value={field.value || ""}
            onChange={(value) => {
              // RHF's onChange is async at runtime even though it is typed as
              // void; catch its rejection so the test can assert on it.
              Promise.resolve(field.onChange(value) as unknown).catch(onRejection);
            }}
          />
        )}
      />
      <Button type="button" onClick={() => reset({ notes: "Restored draft" })}>
        Restore draft
      </Button>
      <Button type="button" onClick={() => reset({ notes: "" })}>
        Clear
      </Button>
    </>
  );
}

async function typeBurst(content: Element, text: string) {
  const view = getEditorView(content);
  const typeKey = (event: KeyboardEvent) => {
    view.dispatch(view.state.replaceSelection(event.key));
  };
  content.addEventListener("keydown", typeKey);
  try {
    for (const char of text) {
      content.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      // Let React flush the keystroke's sync work, but never yield a macrotask.
      await Promise.resolve();
      await Promise.resolve();
    }
  } finally {
    content.removeEventListener("keydown", typeKey);
  }
  return view;
}

describe("MarkdownEditor burst typing (Sentry 7853602321, React #185)", () => {
  const previousActEnvironment = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT;

  beforeEach(() => {
    installCodeMirrorPolyfills();
    // The burst runs outside act() on purpose: act would batch every keystroke
    // into one render and hide the per-keystroke commits.
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      previousActEnvironment;
    vi.restoreAllMocks();
  });

  it("keeps up with a burst of discrete keystrokes without hitting the update-depth limit", async () => {
    const rejections: unknown[] = [];
    let formValue = "";
    const { container } = render(
      <ControlledMarkdownField
        onFormValue={(value) => {
          formValue = value;
        }}
        onRejection={(error) => rejections.push(error)}
      />
    );

    const content = await waitForEditorContent(container);
    const view = await typeBurst(content, BURST);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(rejections.map((error) => (error instanceof Error ? error.message : error))).toEqual([]);
    expect(view.state.doc.toString()).toBe(BURST);
    expect(formValue).toBe(BURST);
  });

  it("still applies values set from outside the editor, including a reset to the initial value", async () => {
    const { container } = render(
      <ControlledMarkdownField onFormValue={() => {}} onRejection={() => {}} />
    );
    const content = await waitForEditorContent(container);
    const view = await typeBurst(content, "typed text");
    await waitFor(() => expect(view.state.doc.toString()).toBe("typed text"));

    fireEvent.click(screen.getByRole("button", { name: "Restore draft" }));
    await waitFor(() => expect(view.state.doc.toString()).toBe("Restored draft"));

    await typeBurst(content, "!");
    await waitFor(() => expect(view.state.doc.toString()).toBe("Restored draft!"));

    // Back to the value the editor was first given: the deferred value has to
    // change for md-editor-rt to resync, so this is the case most likely to
    // be silently dropped.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(view.state.doc.toString()).toBe(""));
  });
});
