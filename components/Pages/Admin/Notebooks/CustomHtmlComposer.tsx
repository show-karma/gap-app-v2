"use client";

import { NotebookSandboxFrame } from "@/components/Pages/Communities/Notebooks/NotebookSandboxFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTEBOOK_CUSTOM_HTML_MAX,
  NOTEBOOK_SECTION_TITLE_MAX,
  type NotebookCustomHtmlSpec,
} from "@/services/notebooks/notebook-spec";

/**
 * The blank canvas: write the page yourself.
 *
 * ADVANCED AND OPT-IN, and the copy says why rather than just labelling it
 * "advanced". Choosing this tier trades away everything the composed builder
 * guarantees — figures computed by our query layer, the em dash for absent
 * data, provenance, a preview that cannot drift from the published page. An
 * author should make that trade knowingly, so the panel says what is lost.
 *
 * THE PREVIEW IS THE PUBLISHED RENDERER. Exactly as in tier A: the same
 * sandboxed frame, the same origin, the same containment. A bespoke preview
 * would be a second implementation to keep in step, and the first time it
 * drifted an author would publish something they had not actually seen — which
 * matters more here than anywhere, because here the author's own code runs.
 */

interface Props {
  spec: NotebookCustomHtmlSpec;
  onChange: (next: NotebookCustomHtmlSpec) => void;
  /** Absent when the feature is unconfigured; the preview then says so. */
  sandboxOrigin?: string;
  /** Leave the blank canvas and go back to the composed builder. */
  onSwitchToComposed: () => void;
}

export function CustomHtmlComposer({ spec, onChange, sandboxOrigin, onSwitchToComposed }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">Custom page</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            You are writing this page yourself. Nothing on it comes from your community&apos;s data
            unless you put it there, so the figures are not checked, not formatted and not kept up
            to date for you.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onSwitchToComposed}>
          Use the guided builder instead
        </Button>
      </div>

      <label className="flex flex-col gap-1 text-sm" htmlFor="custom-html-title">
        <span className="font-medium text-foreground">
          Frame title <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          id="custom-html-title"
          type="text"
          value={spec.title ?? ""}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) =>
            onChange({
              ...spec,
              title: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
        {/* Not decoration: it is what a screen reader announces for the frame,
            and "iframe" is not a description of anything. */}
        <span className="text-xs text-muted-foreground">
          How the page is announced to screen readers. Defaults to the page name.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor="custom-html-body">
        <span className="font-medium text-foreground">HTML</span>
        <Textarea
          id="custom-html-body"
          className="min-h-80 font-mono text-xs"
          value={spec.html}
          maxLength={NOTEBOOK_CUSTOM_HTML_MAX}
          spellCheck={false}
          onChange={(event) => onChange({ ...spec, html: event.target.value })}
        />
        <span className="text-xs text-muted-foreground">
          {spec.html.length.toLocaleString("en-US")} of{" "}
          {NOTEBOOK_CUSTOM_HTML_MAX.toLocaleString("en-US")} characters. Your page runs in an
          isolated frame: it cannot read anything from Karma, and Karma cannot read anything from
          it.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">Preview</h3>
        {spec.html.trim() === "" ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Write some HTML to see it here.
          </p>
        ) : sandboxOrigin ? (
          <NotebookSandboxFrame
            sandboxOrigin={sandboxOrigin}
            html={spec.html}
            title={spec.title ?? "Custom page preview"}
          />
        ) : (
          <p className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
            Custom pages are not available in this environment, so there is nothing to preview.
          </p>
        )}
      </div>
    </div>
  );
}
