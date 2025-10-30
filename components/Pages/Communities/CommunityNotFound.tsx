"use client";

import Link from "next/link";

interface CommunityNotFoundProps {
  communityId: string;
}

export const CommunityNotFound: React.FC<CommunityNotFoundProps> = ({
  communityId,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white">
          Create {communityId} community
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          This community does not exist yet. Be the first to create it and start
          building a transparent, accountable ecosystem for grants and impact
          measurement.
        </p>
        <Link
          href="https://tally.so/r/wd0jeq"
          target="_blank"
          rel="noreferrer"
        >
          <button
            type="button"
            className="bg-primary-500 text-white font-bold rounded-sm px-6 py-3 text-lg hover:bg-primary-600 transition-colors"
          >
            Create Community
          </button>
        </Link>
        <Link
          href="/communities"
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          ← Browse existing communities
        </Link>
      </div>
    </div>
  );
};
