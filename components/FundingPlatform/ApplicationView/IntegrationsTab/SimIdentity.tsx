"use client";

import { CpuChipIcon } from "@heroicons/react/24/solid";
import type { FC, ReactNode } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { cn } from "@/utilities/tailwind";

// Everything a Sim writes carries the same signature: the pixel avatar with a
// chip seal, the Sim's name and an "AI Sim" tag. Humans in the same threads
// never get these, so the two are told apart at a glance.

export const SimAvatar: FC<{
  avatar: string | null | undefined;
  name: string;
  className?: string;
}> = ({ avatar, name, className }) => (
  <span className={cn("relative h-9 w-9 shrink-0", className)}>
    {avatar ? (
      <ProfilePicture
        imageURL={avatar}
        name={name}
        size="36"
        className="h-9 w-9 rounded-md [image-rendering:pixelated]"
        alt=""
      />
    ) : (
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        <CpuChipIcon className="h-5 w-5" />
      </span>
    )}
    <span
      aria-hidden="true"
      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white ring-2 ring-white dark:ring-zinc-800"
    >
      <CpuChipIcon className="h-2.5 w-2.5" />
    </span>
  </span>
);

export const SimTag: FC<{ children?: ReactNode }> = ({ children = "AI Sim" }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
    <CpuChipIcon className="h-3 w-3" />
    {children}
  </span>
);

interface SimAuthorProps {
  name: string;
  avatar: string | null | undefined;
  /** Secondary line under the name; defaults to the Simocracy attribution. */
  detail?: ReactNode;
  /** Right-aligned content (date, badges). */
  trailing?: ReactNode;
}

export const SimAuthor: FC<SimAuthorProps> = ({ name, avatar, detail, trailing }) => (
  <div className="flex flex-wrap items-start justify-between gap-2">
    <div className="flex min-w-0 items-center gap-3">
      <SimAvatar avatar={avatar} name={name} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {name}
          </span>
          <SimTag />
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {detail ?? "AI evaluation by a Simocracy Sim, not a human reviewer"}
        </p>
      </div>
    </div>
    {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
  </div>
);

export const SimSectionHeading: FC<{ title: string; count?: ReactNode }> = ({ title, count }) => (
  <div>
    <div className="flex flex-wrap items-center gap-2">
      <CpuChipIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {count}
    </div>
    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
      Written by the program&apos;s Sims on Simocracy, the reviewers&apos; AI twins. Reviewer
      feedback on them stays private.
    </p>
  </div>
);
