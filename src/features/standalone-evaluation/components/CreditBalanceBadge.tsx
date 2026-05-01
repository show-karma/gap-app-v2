"use client";

import { Coins, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCredits } from "../hooks/useCredits";
import { PurchaseCreditsModal } from "./PurchaseCreditsModal";

export function CreditBalanceBadge() {
  const { data, isLoading, isError, error, refetch } = useCredits();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
        aria-live="polite"
      >
        <Coins className="h-4 w-4 text-brand-500" aria-hidden />
        {isLoading ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading credits
          </span>
        ) : isError ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="text-red-600 underline-offset-2 hover:underline"
            title={error.message}
          >
            Retry credits
          </button>
        ) : (
          <span className="font-medium text-foreground">
            {data?.balance ?? 0}{" "}
            <span className="text-muted-foreground">
              {data?.balance === 1 ? "credit" : "credits"}
            </span>
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Buy more credits"
      >
        Buy more
      </Button>
      <PurchaseCreditsModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
