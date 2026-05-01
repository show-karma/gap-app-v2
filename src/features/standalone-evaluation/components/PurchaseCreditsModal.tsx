"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePurchaseCredits } from "../hooks/useCredits";
import { CREDIT_PACK_INFO, CREDIT_PACKS } from "../schemas/credit.schema";

interface PurchaseCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseCreditsModal({ open, onOpenChange }: PurchaseCreditsModalProps) {
  const purchase = usePurchaseCredits();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Buy evaluation credits</DialogTitle>
          <DialogDescription>
            Each credit covers one application evaluation. You’ll be redirected to Stripe to
            complete payment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((id) => {
            const info = CREDIT_PACK_INFO[id];
            const isPending = purchase.isPending && purchase.variables?.pack === id;
            return (
              <button
                key={id}
                type="button"
                disabled={purchase.isPending}
                onClick={() => purchase.mutate({ pack: id })}
                className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-brand-500/10"
                aria-label={`Buy ${info.label} pack: ${info.credits} credits for ${info.priceLabel}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {info.label}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {info.credits}{" "}
                  <span className="text-base font-medium text-muted-foreground">credits</span>
                </span>
                <span className="text-sm font-semibold text-brand-600">{info.priceLabel}</span>
                <span className="text-xs text-muted-foreground">{info.description}</span>
                {isPending ? (
                  <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Redirecting…
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {purchase.isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {purchase.error.message}
          </div>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={purchase.isPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
