/**
 * @file Safety-lock tests for Sentry GAP-FRONTEND-24S
 * @description `CommentMarkdownInput` (the new-comment box on the funding
 * platform application page) renders through `SafeMdEditor`, which
 * normalizes null `InputEvent.data` before md-editor-rt's `maxLength`
 * overlength check runs. Today `CommentMarkdownInput` never sets `maxLength`,
 * so the buggy branch is unarmed and it cannot currently throw -- but that
 * immunity would be accidental (and silently regress the moment someone adds
 * `maxLength`) if it weren't also routed through the safe boundary. These
 * tests render the REAL editor (md-editor-rt is intentionally NOT mocked) to
 * lock in both: no crash on the null-data input types, and that the
 * component is actually wired through `SafeMdEditor`.
 */

import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentMarkdownInput } from "@/src/features/application-comments/components/CommentMarkdownInput";
import {
  dispatchInputAndCollectErrors,
  installCodeMirrorPolyfills,
  LENGTH_CRASH,
  nullDataInputTypes,
  waitForEditorContent,
} from "../../../../../__tests__/utils/codemirror-jsdom";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("md-editor-rt/lib/style.css", () => ({}));

// Replace next/dynamic with a shim that actually lazy-loads the REAL module,
// so the component renders the genuine md-editor-rt editor in jsdom.
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

describe("CommentMarkdownInput (GAP-FRONTEND-24S safety lock)", () => {
  beforeEach(() => {
    installCodeMirrorPolyfills();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(nullDataInputTypes)(
    "does not throw a length TypeError for inputType=%s with data:null",
    async (inputType) => {
      const utils = render(<CommentMarkdownInput value="existing content" onChange={() => {}} />);
      const content = await waitForEditorContent(utils.container as HTMLElement);

      const errors = dispatchInputAndCollectErrors(content, { data: null, inputType });

      expect(errors.filter((message) => LENGTH_CRASH.test(message))).toEqual([]);
    }
  );
});

describe("CommentMarkdownInput wiring", () => {
  it("renders through SafeMdEditor rather than importing md-editor-rt directly", async () => {
    vi.resetModules();
    const safeMdEditorSpy = vi.fn(() => <div data-testid="safe-md-editor-stub" />);
    vi.doMock("@/components/Utilities/SafeMdEditor", () => ({
      SafeMdEditor: safeMdEditorSpy,
    }));

    const { CommentMarkdownInput: IsolatedCommentMarkdownInput } = await import(
      "@/src/features/application-comments/components/CommentMarkdownInput"
    );

    const utils = render(<IsolatedCommentMarkdownInput value="hello" onChange={() => {}} />);

    await waitFor(() => {
      expect(utils.getByTestId("safe-md-editor-stub")).toBeInTheDocument();
    });
    expect(safeMdEditorSpy).toHaveBeenCalled();

    vi.doUnmock("@/components/Utilities/SafeMdEditor");
    vi.resetModules();
  });
});
