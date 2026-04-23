"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/src/components/navigation/Link";

interface CommunityNotFoundProps {
  communityId: string;
}

export const CommunityNotFound: React.FC<CommunityNotFoundProps> = ({ communityId }) => {
  const slug = communityId?.trim();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Search className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white">
          Community not found
        </h1>
        <p className="text-lg">
          We couldn&apos;t find {slug ? <strong>{slug}</strong> : "this community"}. It may have
          been removed, or the URL may be incorrect.
        </p>
        <Link
          href="/communities"
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          ←&nbsp;Browse existing communities
        </Link>
        <div className="mt-4 flex flex-col items-center gap-3 border-t border-border pt-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Want to start {slug ? `the ${slug}` : "a new"} community?
          </p>
          <Link href="https://tally.so/r/wd0jeq" target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-sm px-4 py-2 text-sm">
              Create Community
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
