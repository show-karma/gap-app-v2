"use client";

import { Coins } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFundingOpportunities } from "@/hooks/useFundingOpportunities";
import type { PaginatedFundingPrograms } from "@/src/features/funding-map/types/funding-program";
import { AlreadyAppliedBanner } from "./AlreadyAppliedBanner";
import { FundingOpportunitiesGrid } from "./FundingOpportunitiesGrid";

interface FundingOpportunitiesProps {
  communityUid: string;
  communitySlug: string;
  initialData?: PaginatedFundingPrograms;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <Coins className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      No funding opportunities available
    </h3>
    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
      There are no active funding programs in this community at the moment. Check back later for new
      opportunities.
    </p>
  </div>
);

const LoadingMore = () => (
  <div className="flex items-center justify-center py-8">
    <Spinner />
  </div>
);

export const FundingOpportunities = ({
  communityUid,
  communitySlug,
  initialData,
}: FundingOpportunitiesProps) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFundingOpportunities({
      communityUid,
    });

  const programs = useMemo(() => {
    if (!data?.pages) {
      return initialData?.programs ?? [];
    }
    return data.pages.flatMap((page) => page.programs);
  }, [data?.pages, initialData?.programs]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Auto-load more if content doesn't fill the viewport
  useEffect(() => {
    if (isLoading || isFetchingNextPage || !hasNextPage) {
      return;
    }

    const handleScroll = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        loadMore();
      }
    };

    const timeoutId = setTimeout(handleScroll, 200);
    return () => clearTimeout(timeoutId);
  }, [hasNextPage, loadMore, isLoading, isFetchingNextPage]);

  if (isLoading && !initialData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (programs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <InfiniteScroll
        dataLength={programs.length}
        next={loadMore}
        hasMore={hasNextPage ?? false}
        loader={<LoadingMore />}
        style={{ overflow: "visible" }}
      >
        <FundingOpportunitiesGrid programs={programs} communitySlug={communitySlug} />
      </InfiniteScroll>
      <AlreadyAppliedBanner communitySlug={communitySlug} />
    </div>
  );
};
