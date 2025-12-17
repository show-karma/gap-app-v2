"use client";

import Link from "next/link";
import type { FC } from "react";
import { useProject } from "@/hooks/useProject";

interface KarmaProjectLinkProps {
  uid: string;
}

export const KarmaProjectLink: FC<KarmaProjectLinkProps> = ({ uid }) => {
  const { project, isLoading } = useProject(uid);

  if (isLoading) {
    return <span className="text-gray-500 animate-pulse">Loading project...</span>;
  }

  const displayName = project?.details?.title || `${uid.slice(0, 10)}...`;

  return (
    <Link
      href={`/project/${uid}`}
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
    >
      {displayName}
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </Link>
  );
};
