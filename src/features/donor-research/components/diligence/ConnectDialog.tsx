"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOutreachPreview, useRequestIntro, useUpdateAdvisorEmail } from "@/hooks/useDiligence";
import { getOutreachBodyIssue, OutreachEmailPreview } from "./OutreachEmailPreview";

interface ConnectDialogProps {
  reportId: string;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives the confirm button (from `view.actions.canConnect`). */
  canConnect: boolean;
  /** Nonprofit display name for the preview's To row (null → row hidden). */
  candidateName?: string | null;
}

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

type EmailFormValues = z.infer<typeof emailSchema>;

type Step = "confirm" | "email";

/**
 * Confirms a NAMED intro that reveals the advisor's identity (and any prior
 * Q&A) to the nonprofit.
 *
 * Before sending, the advisor sees the ENTIRE intro email (DEV-500) and may
 * edit the body; an untouched body POSTs without `body` so the backend
 * composes its own default.
 *
 * If the advisor has no resolvable reply-to email the backend answers
 * `email_required` instead of queuing — we switch to an email-capture step,
 * persist the address, then re-attempt the original intro automatically,
 * preserving any edited body across the capture step.
 */
export function ConnectDialog({
  reportId,
  candidateId,
  open,
  onOpenChange,
  canConnect,
  candidateName,
}: ConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {/* The portal only mounts children when open, so the preview fetch in
            ConnectBody runs lazily, and closing resets the step, the email
            form, and the edited-body draft via unmount. */}
        {open ? (
          <ConnectBody
            reportId={reportId}
            candidateId={candidateId}
            canConnect={canConnect}
            candidateName={candidateName ?? null}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface ConnectBodyProps {
  reportId: string;
  candidateId: string;
  canConnect: boolean;
  candidateName: string | null;
  onClose: () => void;
}

function ConnectBody({
  reportId,
  candidateId,
  canConnect,
  candidateName,
  onClose,
}: ConnectBodyProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [emailPrompt, setEmailPrompt] = useState<string | null>(null);

  const requestIntro = useRequestIntro();
  const updateAdvisorEmail = useUpdateAdvisorEmail();

  const previewQuery = useOutreachPreview(reportId, candidateId, "intro");
  const preview = previewQuery.data;

  // null = untouched. Lives here (not in the preview block) so an edited body
  // survives the switch to the email-capture step and the automatic retry.
  const [draft, setDraft] = useState<string | null>(null);
  const body = draft ?? preview?.bodyText ?? "";
  const isEdited = draft !== null && preview !== undefined && draft !== preview.bodyText;

  const canSend = canConnect && preview !== undefined && getOutreachBodyIssue(body) === null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    // Validate as the advisor types so the "invalid email" message renders
    // immediately (and clears once valid) rather than only on submit.
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const sendIntro = (onEmailRequired: (message: string) => void) => {
    requestIntro.mutate(
      { reportId, candidateId, ...(isEdited ? { body: body.trim() } : {}) },
      {
        onSuccess: (result) => {
          if (result.kind === "queued") {
            toast.success("Intro sent");
            onClose();
          } else {
            onEmailRequired(result.message);
          }
        },
        onError: () => {
          toast.error("Couldn't send the intro. Please try again.");
        },
      }
    );
  };

  const handleConfirm = () => {
    sendIntro((message) => {
      setEmailPrompt(message);
      setStep("email");
    });
  };

  const handleEmailSubmit = handleSubmit((values) => {
    // Persists the email via POST /me (onboarding), then re-attempts the intro.
    updateAdvisorEmail.mutate(
      { email: values.email },
      {
        onSuccess: () => {
          // Re-attempt the original intro (edited body included) now that a
          // reply-to exists.
          sendIntro((message) => {
            setEmailPrompt(message);
            toast.error(message);
          });
        },
        onError: () => {
          toast.error("Couldn't save your email. Please try again.");
        },
      }
    );
  });

  const isSubmittingEmail = updateAdvisorEmail.isPending || requestIntro.isPending;

  if (step === "confirm") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Send a named intro</DialogTitle>
          <DialogDescription>
            Connecting reveals your identity to this nonprofit, along with any answers they've
            already shared. Karma sends them the email below on your behalf — review it and edit if
            needed before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <OutreachEmailPreview
            preview={preview}
            isLoading={previewQuery.isLoading}
            isError={previewQuery.isError}
            onRetry={() => previewQuery.refetch()}
            toName={candidateName}
            body={body}
            onBodyChange={setDraft}
            idPrefix="connect"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canSend || requestIntro.isPending}
            isLoading={requestIntro.isPending}
          >
            Send intro
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit}>
      <DialogHeader>
        <DialogTitle>Add your email</DialogTitle>
        <DialogDescription>
          {emailPrompt ?? "Add an email so we can send the named intro."} We use your email as the
          reply-to for the intro.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 py-2">
        <Label htmlFor="advisor-email">Email address</Label>
        <Input
          id="advisor-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.org"
          aria-invalid={errors.email ? "true" : undefined}
          {...register("email")}
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmittingEmail} isLoading={isSubmittingEmail}>
          Save and send intro
        </Button>
      </DialogFooter>
    </form>
  );
}
