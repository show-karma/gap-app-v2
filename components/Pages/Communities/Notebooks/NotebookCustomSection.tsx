import { notebookSandboxOrigin } from "@/services/notebooks/notebook-sandbox-origin";
import type { NotebookCustomHtmlSection } from "@/services/notebooks/notebook-spec";
import { NotebookSandboxFrame } from "./NotebookSandboxFrame";

/**
 * An author's own HTML, drawn as though it were one of our sections.
 *
 * SEAMLESS IS PRESENTATION; THE ISOLATION IS UNCHANGED. Every byte here still
 * goes into a frame that is `allow-scripts` without `allow-same-origin`, on a
 * separate origin, over a private MessagePort, and is never URL-addressable
 * anywhere. What changes is that the frame stops ANNOUNCING that — no border,
 * no panel, no inner scrollbar, no fonts and colours from the browser's
 * defaults — because a reader is looking at a page, not at a security model,
 * and a bordered box with its own typography in the middle of a report is a
 * seam that makes the page look assembled rather than written.
 *
 * NO WRAPPER ELEMENT, on purpose. A `<div>` here with any padding, background
 * or max-width of its own would put the block on a different measure from the
 * sections above and below it, and the misalignment would be a few pixels —
 * the kind that reads as sloppiness rather than as a decision. The frame is
 * the section: it takes the full width of whatever the page's own layout gives
 * it, so its gutters are the page's gutters by construction.
 *
 * IT FETCHES NOTHING AND RESOLVES NOTHING. Unlike every other section type
 * there is no data prop, because a custom block names no metric — whatever
 * figures are in it were typed by an author. That is what the review surface
 * marks beside it in the builder, and it is the trade the author makes.
 */
export function NotebookCustomSection({ section }: { section: NotebookCustomHtmlSection }) {
  /**
   * Read here rather than threaded down from the route.
   *
   * `NEXT_PUBLIC_*` is inlined at build time, so this is a constant in both
   * the server render and the browser bundle — there is nothing to pass and
   * nothing that could arrive stale. Threading it would mean a new prop on
   * `NotebookOverviewView`, on every caller of it, and on the builder preview,
   * all to deliver a value each of them would have read from the same place.
   */
  const sandboxOrigin = notebookSandboxOrigin();

  /**
   * Unconfigured renders NOTHING, and that differs from the whole-page tier on
   * purpose.
   *
   * A custom PAGE that cannot render has to say so: it is the entire route,
   * and a reader who followed a link to it is owed an explanation. A custom
   * SECTION sits among sections that all rendered fine, so an error panel in
   * the middle of an otherwise complete page tells a reader about our
   * configuration rather than about their community — and there is nothing
   * they could do with it. The author sees the real message in the builder,
   * where it is actionable.
   */
  if (!sandboxOrigin) return null;

  return (
    <NotebookSandboxFrame
      variant="seamless"
      sandboxOrigin={sandboxOrigin}
      html={section.html}
      // The frame's accessible name. Never drawn — see the schema's note on
      // why this field is not a heading — but a screen reader announces the
      // frame either way, and "iframe" is not a description of anything.
      title={section.title ?? "Custom section"}
    />
  );
}
