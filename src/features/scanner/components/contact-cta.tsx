"use client";

import { useState } from "react";
import toast from "react-hot-toast";
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
import { useContact } from "../hooks/use-contact";
import type { ContactRequest, ContactSourceTag } from "../types";

interface ContactCtaProps {
  readonly sourceTag: ContactSourceTag;
  readonly headline: string;
  readonly subline: string;
  readonly defaultEmail?: string;
  readonly defaultOrgName?: string;
  readonly defaultMessage?: string;
  readonly scanId?: string;
  readonly buttonLabel?: string;
}

export function ContactCta({
  sourceTag,
  headline,
  subline,
  defaultEmail = "",
  defaultOrgName = "",
  defaultMessage = "",
  scanId,
  buttonLabel = "Contact us",
}: ContactCtaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [orgName, setOrgName] = useState(defaultOrgName);
  const [message, setMessage] = useState(defaultMessage);

  const {
    mutate: submit,
    isPending,
    isError,
    reset,
  } = useContact({
    onSuccess: () => {
      toast.success("Thanks. We will respond within one business day.");
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Could not send the request. Please try again or email support directly.");
    },
  });

  function handleOpenChange(open: boolean) {
    // Clear any prior error/success state so a stale message doesn't show
    // when the dialog is reopened.
    if (open) reset();
    setIsOpen(open);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: ContactRequest = {
      sourceTag,
      contactEmail: email,
      orgName: orgName || undefined,
      message,
      scanId,
    };
    submit(payload);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{headline}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{subline}</p>
      <Button type="button" onClick={() => handleOpenChange(true)} className="self-start">
        {buttonLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{headline}</DialogTitle>
            <DialogDescription>{subline}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="contact-org">Organization (optional)</Label>
              <Input
                id="contact-org"
                type="text"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="contact-message">What do you need?</Label>
              <textarea
                id="contact-message"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={isPending}
                aria-label="What do you need?"
                className="min-h-[100px] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            {isError ? (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                Could not send the request. Please try again, or email support directly.
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
