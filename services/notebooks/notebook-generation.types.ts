import { z } from "zod";
import { NOTEBOOK_CUSTOM_HTML_MAX, NotebookGeneratedSpecSchema } from "./notebook-spec";

/**
 * The NL → spec generator's contract, and the reviewer's evidence.
 *
 * THE MODEL PROPOSES; THE VALIDATED PIPELINE DISPOSES. What comes back is a
 * spec — never code, SQL or HTML — so it flows through exactly the path a
 * human's clicks would, and a hallucinated metric id is rejected at the same
 * boundary a typo would be. The model chooses WHAT to show; every figure is
 * still computed by our own query layer, so it cannot fabricate a number.
 *
 * WHAT IT CAN STILL GET WRONG is the part this file exists to surface. The
 * model writes PROSE — a headline, a narrative sentence — and prose under a
 * tenant's name is a different risk class from a figure we computed. Hence
 * `authored` as its own source kind: a reviewer must be able to see at a
 * glance which words are the model's own and which numbers are ours, because
 * the em-dash discipline protects the second and does nothing for the first.
 */

export const NOTEBOOK_PROVENANCE_KINDS = ["metric", "kernel", "funding", "authored"] as const;
export type NotebookProvenanceKind = (typeof NOTEBOOK_PROVENANCE_KINDS)[number];

export const NotebookProvenanceSourceSchema = z.object({
  kind: z.enum(NOTEBOOK_PROVENANCE_KINDS),
  /** The catalogue id behind this element, absent when the source is authored. */
  id: z.string().trim().max(200).optional(),
  /**
   * 300, because that is the indexer's bound. NOT 200.
   *
   * A read schema tighter than the write schema is a payload the API happily
   * returns and this build refuses — a valid generation that 400s on arrival
   * and reads like a model fault. The rule for every bound in this file: the
   * indexer's copy is authoritative and this one may be looser, never tighter.
   */
  label: z.string().trim().min(1).max(300),
});

export const NotebookProvenanceEntrySchema = z.object({
  /**
   * Positional key into the generated spec.
   *
   * `sectionId` is preferred and survives the reordering a reviewer does while
   * checking the page; `sectionIndex` is the fallback for a generator that
   * does not echo ids. Both are accepted because the review surface has to
   * work either way — see `attachProvenance`.
   */
  sectionId: z.string().trim().min(1).max(100).optional(),
  sectionIndex: z.number().int().min(0).optional(),
  summary: z.string().trim().min(1).max(500),
  sources: z.array(NotebookProvenanceSourceSchema).max(20),
});

export const NotebookGenerationResultSchema = z.object({
  // Spec-valid or the call fails. A generator that could hand back half a spec
  // would make the builder the place hallucinations get repaired, which is
  // exactly backwards.
  //
  // COMPOSED ONLY, and that is a safety statement rather than a convenience:
  // this generator must never be able to return model-written markup. It
  // belongs in the sandboxed tier, reached deliberately, never smuggled back
  // through the entry that populates the trusted builder.
  //
  // `NotebookGeneratedSpecSchema`, NOT `NotebookComposedSpecSchema`, and the
  // difference is the whole of the guarantee. Custom HTML used to be a page
  // MODE only, so a schema for composed pages refused it for free. It is now
  // also a SECTION type an author may place, which means a plain composed
  // schema here would accept a model-authored page with a custom-html block in
  // it — markup and figures both written by the model, arriving inside the
  // trusted builder. The generated schema is the composed vocabulary minus
  // that one section, and it exists for exactly this line.
  spec: NotebookGeneratedSpecSchema,
  provenance: z.array(NotebookProvenanceEntrySchema).max(60),
  /**
   * Things the generator could not honour, said plainly rather than dropped.
   *
   * 1000 per warning, matching the indexer. A warning is prose explaining what
   * the model could not do, and it is exactly the field that runs long — which
   * made a 500-character reader the thing that turned a wordy explanation into
   * a failed request.
   */
  warnings: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
});

export type NotebookProvenanceSource = z.infer<typeof NotebookProvenanceSourceSchema>;
export type NotebookProvenanceEntry = z.infer<typeof NotebookProvenanceEntrySchema>;
export type NotebookGenerationResult = z.infer<typeof NotebookGenerationResultSchema>;

/** The longest description the generator will accept. */
export const NOTEBOOK_GENERATION_PROMPT_MAX = 2000;

/**
 * Provenance bound to sections in a way that survives review.
 *
 * A reviewer reorders and deletes sections while checking a generated page, so
 * a bare index goes stale the moment they do — and stale provenance is worse
 * than none, because it attributes one section's sources to another. Resolving
 * ONCE into a parallel array, at arrival, means every later edit moves the
 * evidence with the section it belongs to.
 *
 * Deliberately NOT stored in the spec. This is review-time scaffolding, not
 * page content: it has no meaning at render time and no business being
 * persisted into every page forever. The draft lives in the browser until a
 * human saves it, so the browser is exactly where this belongs.
 */
export function attachProvenance(
  sectionCount: number,
  entries: readonly NotebookProvenanceEntry[]
): Array<NotebookProvenanceEntry | undefined> {
  const byIndex = new Map<number, NotebookProvenanceEntry>();
  const unkeyed: NotebookProvenanceEntry[] = [];

  for (const entry of entries) {
    if (entry.sectionIndex !== undefined && entry.sectionIndex < sectionCount) {
      byIndex.set(entry.sectionIndex, entry);
    } else {
      unkeyed.push(entry);
    }
  }

  // An entry with no usable index falls into the first free slot rather than
  // being dropped: evidence the reviewer cannot see is evidence that does not
  // exist, and losing it silently is the failure mode worth avoiding.
  return Array.from({ length: sectionCount }, (_, index) => {
    const keyed = byIndex.get(index);
    if (keyed) return keyed;
    return unkeyed.shift();
  });
}

/**
 * The custom-HTML generator's contract.
 *
 * NO PROVENANCE, AND THAT IS THE POINT. A composed page can name the metric
 * behind every figure because our query layer computed them. Here there is no
 * query layer at all: any number in this document is one the MODEL WROTE, with
 * nothing behind it to check against. There is no honest source to cite, so
 * this returns none — and the review surface has to say so in the strongest
 * terms rather than implying a rigour that does not exist.
 */
export const NotebookCustomGenerationResultSchema = z.object({
  html: z.string().min(1).max(NOTEBOOK_CUSTOM_HTML_MAX),
  warnings: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

export type NotebookCustomGenerationResult = z.infer<typeof NotebookCustomGenerationResultSchema>;
