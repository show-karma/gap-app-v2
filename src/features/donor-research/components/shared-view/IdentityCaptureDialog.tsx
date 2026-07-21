"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

const FullSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(254),
});

// nameOnly mode hides the email field. The schema still types `email`
// as a required string (so FormValues stays a single shape across both
// modes), but skips the `.email()` validator so the hidden empty field
// doesn't block submission — U10 ships display-name-only edits, email
// edits are deferred.
const NameOnlySchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string(),
});

type FormValues = z.infer<typeof FullSchema>;

interface IdentityCaptureDialogProps {
  /** Controls the dialog open state. Parent owns it so submit can close on success. */
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Called with the validated fields. Parent threads them into the next mutation. */
  onSubmit: (values: FormValues) => Promise<void>;
  /** Edit-name-only mode hides the email field — used by the IdentityBadge edit affordance. */
  nameOnly?: boolean;
  /** Pending submit flag from the upstream mutation. */
  isSubmitting?: boolean;
  /**
   * When the viewer is logged in with an email (Privy email login), pass
   * it here. The email field is pre-filled and locked (read-only) since
   * we already hold a verified address. Leave null/empty for anonymous
   * viewers or wallet logins with no email — they get an editable field.
   */
  lockedEmail?: string | null;
}

/**
 * Identity-capture modal triggered on first comment attempt when the
 * commenter has no cookie yet. Uses shadcn Dialog (Radix-backed) so
 * focus trap, escape handling, and aria semantics come for free.
 *
 *   - "use client" because Radix imports run in the client tree.
 *   - displayName max 80, email max 254 — matches backend bounds.
 *   - Pre-PR rule: every data-touching component renders loading,
 *     empty, and error. The Dialog has no fetch surface; the submit
 *     button toggles between idle and submitting, validation errors
 *     render inline.
 */
export function IdentityCaptureDialog({
  open,
  onOpenChange,
  onSubmit,
  nameOnly = false,
  isSubmitting = false,
  lockedEmail = null,
}: IdentityCaptureDialogProps) {
  const hasLockedEmail = Boolean(lockedEmail && lockedEmail.trim().length > 0);
  const form = useForm<FormValues>({
    resolver: zodResolver(nameOnly ? NameOnlySchema : FullSchema),
    defaultValues: { displayName: "", email: hasLockedEmail ? (lockedEmail as string) : "" },
  });

  // The dialog is persistently mounted, so useForm's defaultValues are
  // captured before the Privy session (and thus lockedEmail) resolves —
  // leaving the field locked-but-empty, which dead-ends on the email
  // validator. Re-apply the locked email whenever it resolves or the
  // dialog (re)opens.
  const { setValue } = form;
  useEffect(() => {
    if (open && hasLockedEmail) {
      setValue("email", lockedEmail as string, { shouldValidate: false });
    }
  }, [open, hasLockedEmail, lockedEmail, setValue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {nameOnly ? "Update your display name" : "Add your name and email"}
          </DialogTitle>
          <DialogDescription>
            {nameOnly
              ? "Your future comments will use this name."
              : "Your name appears next to your comments. Your email is private — the report owner uses it to follow up if needed."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              autoComplete="name"
              maxLength={80}
              {...form.register("displayName")}
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          {!nameOnly && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                readOnly={hasLockedEmail}
                aria-readonly={hasLockedEmail || undefined}
                className={
                  hasLockedEmail ? "cursor-not-allowed bg-muted text-muted-foreground" : undefined
                }
                {...form.register("email")}
              />
              {hasLockedEmail && (
                <p className="text-xs text-muted-foreground">From your signed-in account.</p>
              )}
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : nameOnly ? "Save" : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
