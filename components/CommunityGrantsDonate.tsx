"use client";
import { HandHeart } from "lucide-react";
import { useParams } from "next/navigation";
import pluralize from "pluralize";
import { useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { ProjectCartButton } from "@/components/Donation/ProjectCartButton";
import { ShoppingCartIcon as ShoppingCartIconCustom } from "@/components/Icons/ShoppingCartIcon";
import { useCommunityProjectsPaginated } from "@/hooks/useCommunityProjectsPaginated";
import useMediaQuery from "@/hooks/useMediaQuery";
import { Link } from "@/src/components/navigation/Link";
import { useDonationCart } from "@/store";
import type { CommunityProjects } from "@/types/v2/community";
import { projectToGrant } from "@/utilities/adapters/v2/projectToGrant";
import { PAGES } from "@/utilities/pages";
import { GrantCard } from "./GrantCard";
import { CardListSkeleton } from "./Pages/Communities/Loading";

interface CommunityGrantsDonateProps {
  initialProjects: CommunityProjects;
}

export const CommunityGrantsDonate = ({ initialProjects }: CommunityGrantsDonateProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const programId = params.programId as string;
  const { items, toggle } = useDonationCart();
  const isLargeViewport = useMediaQuery("(min-width: 80rem)");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCommunityProjectsPaginated({
      communityId,
      programId,
      itemsPerPage: 12,
    });

  // Flatten all pages into a single array
  const projects = useMemo(() => {
    if (!data?.pages) return initialProjects.payload;
    return data.pages.flatMap((page) => page.payload);
  }, [data, initialProjects.payload]);

  return (
    <div className="flex flex-col gap-4 w-full relative">
      <section className="flex flex-col gap-4 md:flex-row">
        <div className="h-full w-full mb-8">
          {projects.length > 0 ? (
            <InfiniteScroll
              dataLength={projects.length}
              next={fetchNextPage}
              hasMore={hasNextPage || false}
              loader={null}
              style={{ width: "100%", height: "100%" }}
            >
              <AutoSizer disableHeight>
                {({ width }) => {
                  const MIN_CARD_WIDTH = 360;
                  const MAX_COLUMNS_SMALL = 6;
                  const MAX_COLUMNS_LARGE = 3;
                  const calculatedColumns = Math.floor(width / MIN_CARD_WIDTH);
                  const columnCounter = calculatedColumns
                    ? isLargeViewport
                      ? MAX_COLUMNS_LARGE
                      : Math.min(calculatedColumns, MAX_COLUMNS_SMALL)
                    : 1;
                  const columnWidth = Math.floor(width / columnCounter);
                  const gutterSize = 20;
                  const height = Math.ceil(projects.length / columnCounter) * 360;
                  return (
                    <Grid
                      key={`grid-${width}-${columnCounter}-${isLargeViewport}`}
                      height={height + 60}
                      width={width}
                      rowCount={Math.ceil(projects.length / columnCounter)}
                      rowHeight={240}
                      columnWidth={columnWidth}
                      columnCount={columnCounter}
                      cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                        const project = projects[rowIndex * columnCounter + columnIndex];
                        return (
                          <div
                            key={key}
                            style={{
                              ...style,
                              left: +(style.left || 0) + (columnIndex > 0 ? gutterSize : 0),
                              width: +(style.width || 0) - (columnIndex > 0 ? gutterSize : 0),
                              top: +(style.top || 0) + (rowIndex > 0 ? gutterSize : 0),
                              height: +(style.height || 0) - (rowIndex > 0 ? gutterSize : 0),
                            }}
                          >
                            {project && (
                              <div style={{ height: "100%", width: "100%" }}>
                                <GrantCard
                                  index={rowIndex * columnCounter + columnIndex}
                                  key={project.uid}
                                  grant={projectToGrant(project)}
                                  hideStats
                                  hideCategories
                                  cardClassName="rounded-lg"
                                  actionSlot={
                                    <ProjectCartButton
                                      projectUid={project.uid}
                                      projectTitle={project.details?.title || project.uid}
                                      projectSlug={project.details?.slug}
                                      projectImageURL={project.details?.logoUrl}
                                      chainPayoutAddress={project.chainPayoutAddress}
                                      isInCart={items.some((i) => i.uid === project.uid)}
                                      onToggle={toggle}
                                    />
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  );
                }}
              </AutoSizer>
            </InfiniteScroll>
          ) : null}
          {isLoading || isFetchingNextPage ? (
            <div className="w-full flex items-center justify-center">
              <CardListSkeleton />
            </div>
          ) : null}
          {!isLoading && !isFetchingNextPage && projects.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                <HandHeart className="h-6 w-6 text-gray-400 dark:text-zinc-500" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                No projects are accepting donations in this program yet.
              </h2>
              <p className="max-w-md text-sm text-gray-600 dark:text-zinc-400">
                Check back soon, or explore other projects in this community.
              </p>
              <Link
                href={PAGES.COMMUNITY.PROJECTS(communityId)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse community projects
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* Floating Cart Button */}
      {items.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Link
            href={`/community/${communityId}/donate/${programId}/checkout`}
            className="box-border inline-flex items-center justify-center gap-3 px-7 py-4 relative rounded-[40px] overflow-hidden border border-solid border-gray bg-[linear-gradient(90deg,rgba(0,78,235,1)_0%,rgba(131,8,145,1)_80%)] text-white hover:opacity-80 transition-all duration-200"
          >
            <div className="relative">
              <ShoppingCartIconCustom className="text-white" width="21" height="21" />
            </div>
            <span className="font-semibold whitespace-nowrap">
              Checkout ({pluralize("item", items.length, true)})
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};
