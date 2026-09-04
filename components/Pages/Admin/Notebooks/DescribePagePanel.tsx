"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  attachProvenance,
  NOTEBOOK_GENERATION_PROMPT_MAX,
  type NotebookProvenanceEntry,
} from "@/services/notebooks/notebook-generation.types";
import type { NotebookComposedSpec } from "@/services/notebooks/notebook-spec";
import { generateNotebookSpec } from "@/services/notebooks-admin.service";

/**
 * Describe the page you want; review what comes back.
 *
 * THE ENTRY IS THE EASY HALF. The important half is what this component
 * deliberately CANNOT do: it hands the composer a proposal and stops. There is
 * no path from here to saving and none to publishing — not because publishing
 * is guarded downstream (it is, by SC4) but because this component never
 * touches those mutations at all. A model composes a page under a community's
 * name; a person decides that page is true.
 *
 * REVIEW MEANS LOOKING AT THE REAL NUMBERS. The generated sections land in the
 * existing composer and preview, which render through the very components the
 * published page uses, against live data. So an admin verifying a generated
 * page is checking actual figures — not a mock, and not the model's account of
 * what the figures are. That is the entire safety story, and it works because
 * the model only ever chose WHAT to show.
 */

interface Props {
  communitySlug: string;
  /** Whether the composer already holds work that generating would replace. */
  hasExistingSections: boolean;
  onGenerated: (result: {
    spec: NotebookComposedSpec;
    provenance: Array<NotebookProvenanceEntry | undefined>;
    /** What the generator could not honour. Surfaced, never swallowed. */
    warnings: string[];
  }) => void;
}

/**
 * What to tell an admin when generation fails.
 *
 * NOT `error.message`. The api client's HttpError formats itself as
 * "HTTP 502 POST /v2/communities/0xf11e…/notebook-configs/generate" — an
 * internal path in the reviewer's face, saying nothing they can act on. The
 * server's own explanation lives in `body.message`, and it is written for a
 * person, so that is what gets shown.
 *
 * Found by calling the live endpoint. The unit tests mocked a friendly
 * `new Error("...")` whose `message` was already presentable — a shape the
 * real client never produces. The mock was, once again, more cooperative than
 * the wire.
 *
 * The status split matters because the remedies differ: a 403 means ask
 * someone for access, a 5xx means try again or tell us.
 */
function generationErrorMessage(error: unknown): string {
  const status = isRecord(error) && typeof error.status === "number" ? error.status : undefined;

  if (status === 401 || status === 403) {
    return "You do not have permission to generate pages for this community.";
  }

  const body = isRecord(error) ? error.body : undefined;
  const serverMessage = isRecord(body) && typeof body.message === "string" ? body.message : "";
  if (serverMessage.trim()) return serverMessage.trim();

  return "The page could not be generated. Try describing it again, or a little differently.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type Status =
  | { state: "idle" }
  | { state: "confirming" }
  | { state: "running" }
  | { state: "failed"; message: string };

export function DescribePagePanel({ communitySlug, hasExistingSections, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const run = async () => {
    setStatus({ state: "running" });
    try {
      const result = await generateNotebookSpec(communitySlug, prompt.trim());
      onGenerated({
        spec: result.spec,
        provenance: attachProvenance(result.spec.sections.length, result.provenance),
        warnings: result.warnings,
      });
      setStatus({ state: "idle" });
    } catch (error) {
      setStatus({ state: "failed", message: generationErrorMessage(error) });
    }
  };

  const start = () => {
    // Replacing an author's work without asking is unforgivable, and merging
    // two page structures is a guess. So: replace, but only ever on purpose.
    if (hasExistingSections) {
      setStatus({ state: "confirming" });
      return;
    }
    void run();
  };

  const canGenerate = prompt.trim().length > 0 && status.state !== "running";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Describe the page</h2>
        <p className="text-sm text-muted-foreground">
          Say what you want to show and we will compose a draft from your community&apos;s own data.
          It arrives as a proposal for you to check — nothing is saved or published until you say
          so.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm" htmlFor="describe-page-prompt">
        <span className="sr-only">Describe the page</span>
        <Textarea
          id="describe-page-prompt"
          className="min-h-24"
          value={prompt}
          maxLength={NOTEBOOK_GENERATION_PROMPT_MAX}
          placeholder="A kernel health page for the last 90 days: what is in scope, how well it reports, and the tier rollup."
          onChange={(event) => setPrompt(event.target.value)}
          disabled={status.state === "running"}
        />
      </label>

      {status.state === "confirming" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warning-500 p-3">
          <p className="text-sm text-foreground">
            This page already has sections. Generating replaces all of them.
          </p>
          <div className="flex flex-row gap-2">
            <Button type="button" variant="secondary" onClick={() => void run()}>
              Replace my sections
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatus({ state: "idle" })}>
              Keep what I have
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-3">
          <Button type="button" onClick={start} disabled={!canGenerate}>
            {status.state === "running" ? "Composing…" : "Compose a draft"}
          </Button>
          {status.state === "failed" ? (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
