"use client";

import { Copy, ExternalLink, MoreHorizontal, Pencil, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Link } from "@/src/components/navigation/Link";
import type { ApplicationStatus } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";
import { getStatusVisual } from "./application-status-ui";

interface ApplicationHeaderProps {
  programName: string;
  status: ApplicationStatus;
  showEditButton: boolean;
  editHref: string;
  publicHref: string;
  /** True for reviewers/admins — exposes the admin-panel shortcut even when they also own the application. */
  canReviewInAdmin: boolean;
  reviewHref: string;
}

export function ApplicationHeader({
  programName,
  status,
  showEditButton,
  editHref,
  publicHref,
  canReviewInAdmin,
  reviewHref,
}: ApplicationHeaderProps) {
  const visual = getStatusVisual(status);
  const [, copy] = useCopyToClipboard();

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      copy(window.location.href, "Link copied to clipboard");
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
        Application for {programName}
      </h1>

      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold",
            visual.pillClass
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", visual.dotClass)} />
          {visual.label}
        </span>

        {showEditButton && (
          <Link
            href={editHref}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More options"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {showEditButton && (
              <DropdownMenuItem asChild>
                <Link href={editHref} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit application
                </Link>
              </DropdownMenuItem>
            )}
            {canReviewInAdmin && (
              <DropdownMenuItem asChild>
                <Link href={reviewHref} className="cursor-pointer">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Review in admin panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={publicHref} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View public application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
