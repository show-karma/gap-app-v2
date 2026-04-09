"use client";

import { ExternalLink } from "lucide-react";
import type React from "react";
import { useProjectSearch } from "@/hooks/useProjectSearch";

interface KarmaProjectLinkProps {
  uid: string;
}

export const KarmaProjectLink: React.FC<KarmaProjectLinkProps> = ({ uid }) => {
  const { projects, isLoading } = useProjectSearch(uid, {
    enabled: !!uid,
  });

  const project = projects?.[0];

  if (isLoading) {
    return <span className="animate-pulse text-zinc-400">Loading project...</span>;
  }

  const displayName = project?.details?.title || `${uid.slice(0, 10)}...`;

  return (
    <a
      href={`https://www.karmahq.xyz/project/${uid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {displayName}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
};
