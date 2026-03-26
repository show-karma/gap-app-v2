"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApplicationLookup } from "../hooks/use-application-lookup";
import { ApplicationFoundResult } from "./ApplicationFoundResult";
import { ApplicationLookupForm } from "./ApplicationLookupForm";
import { ApplicationNotFound } from "./ApplicationNotFound";

interface ApplicationLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  communitySlug?: string;
  communityName?: string;
}

export function ApplicationLookupModal({
  isOpen,
  onClose,
  communitySlug,
  communityName,
}: ApplicationLookupModalProps) {
  const { lookupApplication, result, error, isLoading, reset } = useApplicationLookup();

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find Your Application</DialogTitle>
          <DialogDescription>
            Enter your application reference number to find which credential you used
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!result && !error && (
            <ApplicationLookupForm onSubmit={lookupApplication} isLoading={isLoading} />
          )}

          {error && <ApplicationNotFound error={error} communityName={communityName} />}

          {result && (
            <ApplicationFoundResult result={result} currentCommunitySlug={communitySlug} />
          )}

          {(result || error) && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={reset} size="sm">
                Look up another application
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
