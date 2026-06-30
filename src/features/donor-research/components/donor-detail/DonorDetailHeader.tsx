"use client";

import { ArrowLeft } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import type { DonorHandle } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";

interface DonorDetailHeaderProps {
  handle: DonorHandle;
}

/** Page header: back link to the picker context + the handle's opaque label. */
export function DonorDetailHeader({ handle }: DonorDetailHeaderProps) {
  const label = handle.opaqueLabel?.trim() ? handle.opaqueLabel : "Untitled donor handle";

  return (
    <header className="flex flex-col gap-2">
      <Link
        href={PAGES.DONOR_RESEARCH.INDEX}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Donor handles
      </Link>
      <h1 className="text-xl font-semibold">{label}</h1>
    </header>
  );
}
