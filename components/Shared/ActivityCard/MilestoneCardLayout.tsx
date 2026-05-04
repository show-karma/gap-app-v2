"use client";

import type { FC, ReactNode } from "react";
import { Link } from "@/src/components/navigation/Link";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { ActivityAttribution } from "./ActivityAttribution";
import { containerClassName } from "./styles";

interface MilestoneCardLayoutProps {
  /** Top text row — usually project / grant identification. */
  header?: ReactNode;
  /** Element rendered in the top-right corner of the card body (e.g., info tooltip). */
  topRightSlot?: ReactNode;
  /** Inline row of badges/pills (status, order, allocation, due date, etc.). */
  pills?: ReactNode;
  /** Main milestone title. */
  title: string;
  /** Optional description rendered with ReadMore. */
  description?: string | null;
  /** Optional secondary "View …" link rendered below the description. */
  viewLink?: { href: string; label: string; external?: boolean };
  /** Date for the attribution footer. Footer is hidden when missing. */
  attributionDate?: number | string | null;
  /** Address or empty string. Empty string hides the attester avatar. */
  attributionAttester?: string;
  /** Right-side action slot (buttons, menus). */
  attributionActions?: ReactNode;
  /** Toggles "Created on" / "Completed on" copy. */
  attributionIsCompleted?: boolean;
  className?: string;
}

export const MilestoneCardLayout: FC<MilestoneCardLayoutProps> = ({
  header,
  topRightSlot,
  pills,
  title,
  description,
  viewLink,
  attributionDate,
  attributionAttester,
  attributionActions,
  attributionIsCompleted = false,
  className,
}) => {
  const showAttribution = Boolean(attributionDate) || Boolean(attributionActions);

  return (
    <div className={cn(containerClassName, "flex flex-col w-full relative", className)}>
      {topRightSlot ? <div className="absolute top-3 right-3 z-10">{topRightSlot}</div> : null}
      <div className="flex flex-col gap-3 w-full px-5 py-4">
        {header ? <div className="flex flex-col gap-1 min-w-0 text-sm pr-8">{header}</div> : null}

        {pills ? (
          <div className="flex flex-row items-center gap-3 flex-wrap pr-8">{pills}</div>
        ) : null}

        <h3 className="text-xl text-[#101828] dark:text-zinc-100 pr-8">{title}</h3>

        {description ? (
          <div className="flex flex-col my-2">
            <ReadMore side="left">{description}</ReadMore>
          </div>
        ) : null}

        {viewLink ? (
          <Link
            href={viewLink.href}
            className="text-brand-blue hover:underline text-sm font-medium"
            {...(viewLink.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {viewLink.label}
          </Link>
        ) : null}
      </div>

      {showAttribution ? (
        <ActivityAttribution
          date={attributionDate ?? ""}
          attester={attributionAttester || ""}
          actions={attributionActions}
          isCompleted={attributionIsCompleted}
        />
      ) : null}
    </div>
  );
};
