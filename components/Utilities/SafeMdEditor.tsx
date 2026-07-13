"use client";

import "md-editor-rt/lib/style.css";
import type { EditorProps } from "md-editor-rt";
import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { normalizeNullInputEventData } from "@/components/Utilities/utils/normalize-null-input-event-data";

// The ONLY place in the app allowed to value-import `md-editor-rt`. Every
// consumer must render <SafeMdEditor> instead of importing MdEditor
// directly (enforced by .taskless/rules/no-direct-md-editor-import.yml) so
// the null-InputEvent shim below can never be bypassed. Keeping the dynamic
// import here also means md-editor-rt is never statically bundled anywhere
// else (see __tests__/performance/lazy-imports.perf.test.ts).
const MdEditor = dynamic(() => import("md-editor-rt").then((mod) => mod.MdEditor), {
  ssr: false,
  loading: () => null,
});

export type SafeMdEditorProps = EditorProps & {
  "data-field-id"?: string;
  "aria-describedby"?: string;
};

/**
 * md-editor-rt@6.4.1 crash boundary (Sentry GAP-FRONTEND-1WY / GAP-FRONTEND-24S).
 *
 * The library's CodeMirror `input` DOM-event handler destructures
 * `InputEvent.data` and reads `.length` on it inside its `maxLength`
 * overlength check, unguarded. Per the Input Events spec, `data` is `null`
 * for `deleteContentBackward`, `insertParagraph`/`insertLineBreak`,
 * `insertFromPaste` and `insertFromDrop` -- i.e. every Backspace, Enter, and
 * paste, and especially mobile IME deletions -- so the handler throws
 * `TypeError: Cannot read properties of null (reading 'length')` (V8) /
 * `null is not an object (evaluating 'r.length')` (WebKit/Safari).
 *
 * This boundary always normalizes the InputEvent (before the library's own
 * onInput consumer runs) and always defaults `value` to `""`, so no
 * consumer can re-introduce the crash by passing `maxLength` without also
 * wiring the shim. Delete once the upstream canary test
 * (`__tests__/components/Utilities/MarkdownEditor.nullInputEvent.test.tsx`)
 * starts failing -- that means md-editor-rt fixed the null guard upstream.
 */
export function SafeMdEditor({ value, onInput, ...rest }: SafeMdEditorProps) {
  // md-editor-rt's `config()` mutates the library's global markdown-it
  // instance shared by every MdEditor/MdPreview on the page. Configuring it
  // here -- the single boundary every editor renders through -- avoids
  // order-dependent global state where the setting only "sticks" if some
  // other MarkdownEditor happened to mount first.
  useEffect(() => {
    import("md-editor-rt")
      .then(({ config }) => {
        config({
          markdownItConfig(md) {
            md.options.breaks = true;
          },
        });
      })
      .catch(() => {
        // SUPPRESSED: this dynamic import only tunes markdown-it's `breaks`
        // option (cosmetic single-newline -> <br>). A genuine load failure of
        // md-editor-rt already surfaces through the `dynamic()` MdEditor below,
        // so reporting it here would only duplicate that signal.
      });
  }, []);

  const handleInput = useCallback(
    (event: Event) => {
      normalizeNullInputEventData(event);
      onInput?.(event);
    },
    [onInput]
  );

  return <MdEditor {...rest} value={value ?? ""} onInput={handleInput} />;
}
