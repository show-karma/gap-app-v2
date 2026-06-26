"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { useRequestIntro, useUpdateAdvisorEmail } from "@/hooks/useDiligence";

interface ConnectDialogProps {
  reportId: string;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives the confirm button (from `view.actions.canConnect`). */
  canConnect: boolean;
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
 * If the advisor has no resolvable reply-to email the backend answers
 * `email_required` instead of queuing — we switch to an email-capture step,
 * persist the address, then re-attempt the original intro automatically.
 */
export function ConnectDialog({
  reportId,
  candidateId,
  open,
  onOpenChange,
  canConnect,
}: ConnectDialogProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [emailPrompt, setEmailPrompt] = useState<string | null>(null);

  const requestIntro = useRequestIntro();
  const updateAdvisorEmail = useUpdateAdvisorEmail();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  // Reset to the first step whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setEmailPrompt(null);
      reset({ email: "" });
    }
  }, [open, reset]);

  const close = () => onOpenChange(false);

  const sendIntro = (onEmailRequired: (message: string) => void) => {
    requestIntro.mutate(
      { reportId, candidateId },
      {
        onSuccess: (result) => {
          if (result.kind === "queued") {
            toast.success("Intro sent");
            close();
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
    // UNVERIFIED: advisor email endpoint pending DEV-427 confirmation.
    updateAdvisorEmail.mutate(
      { email: values.email },
      {
        onSuccess: () => {
          // Re-attempt the original intro now that a reply-to exists.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Send a named intro</DialogTitle>
              <DialogDescription>
                Connecting reveals your identity to this nonprofit, along with any answers they've
                already shared. Karma sends them a warm intro on your behalf.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!canConnect || requestIntro.isPending}
                isLoading={requestIntro.isPending}
              >
                Send intro
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleEmailSubmit}>
            <DialogHeader>
              <DialogTitle>Add your email</DialogTitle>
              <DialogDescription>
                {emailPrompt ?? "Add an email so we can send the named intro."} We use your email as
                the reply-to for the intro.
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
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEmail} isLoading={isSubmittingEmail}>
                Save and send intro
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
