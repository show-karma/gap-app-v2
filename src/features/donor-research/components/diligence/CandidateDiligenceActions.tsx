"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCandidateDiligence } from "@/hooks/useDiligence";
import { relativeDays } from "../report-brief/text-utils";
import { AskQuestionsDialog } from "./AskQuestionsDialog";
import { ConnectDialog } from "./ConnectDialog";
import { DiligenceAnswers } from "./DiligenceAnswers";
import { DiligenceStatusBadge } from "./DiligenceStatusBadge";

interface CandidateDiligenceActionsProps {
  reportId: string;
  candidateId: string;
}

/**
 * Per-candidate diligence footer for the advisor report view. Self-contained:
 * fetches its own candidate-diligence view and renders the status badge, the
 * two gated actions (Ask Questions / Connect), any collected answers, and the
 * intro state. Rendered per-candidate inside maps, so memoized.
 *
 * Anonymity: this component is mounted ONLY on the advisor surface (the donor
 * shared view never passes `showDiligenceActions`), so the actions cannot leak
 * onto a public share.
 */
export const CandidateDiligenceActions = memo(function CandidateDiligenceActions({
  reportId,
  candidateId,
}: CandidateDiligenceActionsProps) {
  const [askOpen, setAskOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const diligenceQuery = useCandidateDiligence(reportId, candidateId);

  if (diligenceQuery.isLoading) {
    return (
      <div className="mt-6 flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <Spinner className="size-3.5" />
        <span>Loading actions…</span>
      </div>
    );
  }

  if (diligenceQuery.isError || !diligenceQuery.data) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span>Couldn't load actions.</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => diligenceQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const view = diligenceQuery.data;
  const { actions, coarseStatus, request, latestAnswers, intro } = view;
  const introLabel = intro ? introStateLabel(intro.sentAt) : null;

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {coarseStatus === "not_requested" ? null : <DiligenceStatusBadge status={coarseStatus} />}
          {introLabel ? <span className="text-xs text-muted-foreground">{introLabel}</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!actions.canAskQuestions}
            onClick={() => setAskOpen(true)}
          >
            Ask questions
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!actions.canConnect}
            onClick={() => setConnectOpen(true)}
          >
            Connect
          </Button>
        </div>
      </div>

      {request && latestAnswers ? (
        <DiligenceAnswers request={request} answers={latestAnswers} />
      ) : null}

      <AskQuestionsDialog
        reportId={reportId}
        candidateId={candidateId}
        open={askOpen}
        onOpenChange={setAskOpen}
        view={view}
      />
      <ConnectDialog
        reportId={reportId}
        candidateId={candidateId}
        open={connectOpen}
        onOpenChange={setConnectOpen}
        canConnect={actions.canConnect}
      />
    </div>
  );
});

function introStateLabel(sentAt: string | null): string {
  if (!sentAt) {
    return "Intro queued";
  }
  const ms = Date.parse(sentAt);
  if (Number.isNaN(ms)) {
    return "Intro sent";
  }
  const when = relativeDays(ms);
  return when ? `Intro sent ${when}` : "Intro sent";
}
