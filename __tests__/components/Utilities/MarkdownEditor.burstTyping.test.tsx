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

const BURST = "- typed by a snippet tool that sends one character every millisecond, no pause";

type FormValues = { notes: string };

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

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(view.state.doc.toString()).toBe(""));
  });
});
