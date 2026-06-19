"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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

const FormSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(254),
});

type FormValues = z.infer<typeof FormSchema>;

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
}: IdentityCaptureDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { displayName: "", email: "" },
  });

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
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
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
