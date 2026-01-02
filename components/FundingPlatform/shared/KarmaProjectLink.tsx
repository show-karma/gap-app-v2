"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { useProject } from "@/hooks/useProject";
import { PAGES } from "@/utilities/pages";

interface KarmaProjectLinkProps {
  uid: string;
}

export const KarmaProjectLink: FC<KarmaProjectLinkProps> = ({ uid }) => {
  const { project, isLoading, isError } = useProject(uid);

  if (isLoading) {
    return <span className="text-gray-500 animate-pulse">Loading project...</span>;
  }

  if (isError) {
    return (
      <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1">
        <span>Failed to load project</span>
        <span className="text-xs text-gray-500">({uid.slice(0, 10)}...)</span>
      </span>
    );
  }

  const displayName = project?.details?.title || `${uid.slice(0, 10)}...`;

  return (
    <Link
      href={PAGES.PROJECT.OVERVIEW(uid)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${displayName} (opens in new tab)`}
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
    >
      {displayName}
      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
    </Link>
  );
};
