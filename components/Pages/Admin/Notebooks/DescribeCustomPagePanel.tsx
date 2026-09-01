"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NOTEBOOK_GENERATION_PROMPT_MAX } from "@/services/notebooks/notebook-generation.types";
import { generateCustomNotebookHtml } from "@/services/notebooks-admin.service";

/**
 * Describe a fully-custom page and have the model write it.
 *
 * THE REVIEW BURDEN HERE IS HEAVIER THAN TIER A, and the copy has to say so
 * rather than reusing the gentler framing. In tier A the model chooses WHAT to
 * show and our query layer computes every figure, so a reviewer is checking
 * that the right numbers were chosen. Here there is no query layer at all: any
 * figure in the document is one the MODEL WROTE, with nothing behind it. The
 * em-dash discipline, the pooled denominators, the provenance trail — none of
 * it applies, because none of it exists on this path.
 *
 * So there is no provenance to show and this panel does not pretend otherwise.
 * Citing a source that does not exist would be worse than citing none: it
 * would lend a model's prose the credibility of a computed figure.
 *
 * Like the composed entry, it holds NO save and NO publish mutation. Draft-only
 * is a thing this component cannot do rather than a rule it obeys.
 */

interface Props {
  communitySlug: string;
  /** Whether the canvas already holds work that generating would replace. */
  hasExistingHtml: boolean;
  onGenerated: (result: { html: string; warnings: string[] }) => void;
}

type Status =
  | { state: "idle" }
  | { state: "confirming" }
  | { state: "running" }
  | { state: "failed"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** The server's own sentence, never the client's "HTTP 502 POST /…" string. */
function failureMessage(error: unknown): string {
  const status = isRecord(error) && typeof error.status === "number" ? error.status : undefined;
  if (status === 401 || status === 403) {
    return "You do not have permission to generate pages for this community.";
  }
  const body = isRecord(error) ? error.body : undefined;
  const serverMessage = isRecord(body) && typeof body.message === "string" ? body.message : "";
  if (serverMessage.trim()) return serverMessage.trim();
  return "The page could not be generated. Try describing it again, or a little differently.";
}

export function DescribeCustomPagePanel({ communitySlug, hasExistingHtml, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const run = async () => {
    setStatus({ state: "running" });
    try {
      const result = await generateCustomNotebookHtml(communitySlug, prompt.trim());
      onGenerated({ html: result.html, warnings: result.warnings });
      setStatus({ state: "idle" });
    } catch (error) {
      setStatus({ state: "failed", message: failureMessage(error) });
    }
  };

  const start = () => {
    if (hasExistingHtml) {
      setStatus({ state: "confirming" });
      return;
    }
    void run();
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Describe a custom page</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The model writes the whole page — layout, words and any numbers in it. Nothing here comes
          from your community&apos;s data, so{" "}
          <strong className="font-medium text-foreground">
            every figure it writes is the model&apos;s own and has not been checked against anything
          </strong>
          . Read it closely before you save it, and check any number against a page that computes
          its figures.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm" htmlFor="describe-custom-prompt">
        <span className="sr-only">Describe the custom page</span>
        <Textarea
          id="describe-custom-prompt"
          className="min-h-24"
          value={prompt}
          maxLength={NOTEBOOK_GENERATION_PROMPT_MAX}
          placeholder="A single-page overview of our grants programme, in our brand colours, with a hero and three columns."
          onChange={(event) => setPrompt(event.target.value)}
          disabled={status.state === "running"}
        />
      </label>

      {status.state === "confirming" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warning-500 p-3">
          <p className="text-sm text-foreground">
            This page already has HTML. Generating replaces all of it.
          </p>
          <div className="flex flex-row gap-2">
            <Button type="button" variant="secondary" onClick={() => void run()}>
              Replace my page
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatus({ state: "idle" })}>
              Keep what I have
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-3">
          <Button
            type="button"
            onClick={start}
            disabled={prompt.trim().length === 0 || status.state === "running"}
          >
            {status.state === "running" ? "Writing…" : "Write a draft"}
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
