"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";

interface PaginationProps {
  total: number;
  page: number;
  onChange: (page: number) => void;
  showControls?: boolean;
  boundaries?: number;
  siblings?: number;
  className?: string;
}

function _getRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function buildPages(
  total: number,
  page: number,
  siblings: number,
  boundaries: number
): (number | "...")[] {
  if (total <= 1) return [1];

  const leftBound = Math.max(2, page - siblings);
  const rightBound = Math.min(total - 1, page + siblings);

  const showLeftDots = leftBound > boundaries + 2;
  const showRightDots = rightBound < total - boundaries - 1;

  const pages: (number | "...")[] = [];

  // Left boundary pages
  for (let i = 1; i <= Math.min(boundaries, total); i++) {
    pages.push(i);
  }

  if (showLeftDots) {
    pages.push("...");
  }

  for (let i = leftBound; i <= rightBound; i++) {
    if (i > boundaries && i < total - boundaries + 1) {
      pages.push(i);
    }
  }

  if (showRightDots) {
    pages.push("...");
  }

  // Right boundary pages
  for (let i = Math.max(total - boundaries + 1, boundaries + 1); i <= total; i++) {
    pages.push(i);
  }

  return pages;
}

export function Pagination({
  total,
  page,
  onChange,
  showControls = true,
  boundaries = 1,
  siblings = 1,
  className,
}: PaginationProps) {
  if (total <= 1) return null;

  const pages = buildPages(total, page, siblings, boundaries);

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Pagination">
      {showControls && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`dots-${i}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={p}
            type="button"
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-sm"
            onClick={() => onChange(p as number)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        )
      )}

      {showControls && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(page + 1)}
          disabled={page >= total}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  );
}
