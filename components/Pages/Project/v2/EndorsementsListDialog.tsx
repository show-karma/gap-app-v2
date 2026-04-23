"use client";

import { BadgeCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/store";
import { formatDate } from "@/utilities/formatDate";

const ITEMS_PER_PAGE = 12;

interface ProjectEndorsementV2 {
  uid: string;
  endorsedBy: Hex;
  comment?: string;
  createdAt: string;
}

interface EndorsementRowProps {
  endorsement: ProjectEndorsementV2;
}

function EndorsementRow({ endorsement }: EndorsementRowProps) {
  return (
    <div className="flex flex-col w-full p-4 gap-3">
      <div className="flex flex-row gap-2 w-full items-start">
        <div className="flex flex-row gap-2 w-full items-center">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">
              <EthereumAddressToProfileName
                address={endorsement.endorsedBy}
                showProfilePicture
                pictureClassName="h-8 w-8 rounded-full"
              />
            </p>
            <p className="text-xs text-muted-foreground">
              endorsed on {formatDate(endorsement.createdAt)}
            </p>
          </div>
        </div>
      </div>
      {endorsement.comment && (
        <div className="text-sm text-muted-foreground pl-10">
          <MarkdownPreview source={endorsement.comment} />
        </div>
      )}
    </div>
  );
}

function EmptyEndorsements() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <BadgeCheckIcon className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-muted-foreground text-center">
        No endorsements yet.
        <br />
        Be the first to endorse this project!
      </p>
    </div>
  );
}

interface EndorsementsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndorsementsListDialog({ open, onOpenChange }: EndorsementsListDialogProps) {
  const project = useProjectStore((state) => state.project);
  const [page, setPage] = useState<number>(1);

  // Reset pagination when dialog opens
  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  // Compute unique, sorted endorsements
  const { displayedEndorsements, hasMore, totalCount } = useMemo(() => {
    const endorsements = (project?.endorsements || []) as ProjectEndorsementV2[];

    // Deduplicate by address, keeping latest endorsement per address
    const addresses: Record<Hex, ProjectEndorsementV2> = {};
    endorsements.forEach((endorsement) => {
      const existingEndorsement = addresses[endorsement.endorsedBy];
      if (existingEndorsement) {
        if (new Date(existingEndorsement.createdAt) < new Date(endorsement.createdAt)) {
          addresses[endorsement.endorsedBy] = endorsement;
        }
      } else {
        addresses[endorsement.endorsedBy] = endorsement;
      }
    });

    const uniqueEndorsements = Object.values(addresses);
    const ordered = uniqueEndorsements.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const sliced = ordered.slice(0, ITEMS_PER_PAGE * page);
    const canLoadMore = uniqueEndorsements.length > sliced.length;

    return {
      displayedEndorsements: sliced,
      hasMore: canLoadMore,
      totalCount: uniqueEndorsements.length,
    };
  }, [project?.endorsements, page]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheckIcon className="h-5 w-5" />
            Endorsements
            {totalCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
            )}
          </DialogTitle>
          <DialogDescription>People who have endorsed this project on-chain</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {displayedEndorsements.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {displayedEndorsements.map((endorsement) => (
                <EndorsementRow key={endorsement.uid} endorsement={endorsement} />
              ))}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button onClick={() => setPage((old) => old + 1)} className="text-sm">
                    Load more
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyEndorsements />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
