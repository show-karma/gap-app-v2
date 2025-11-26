"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { ShoppingCartIcon as ShoppingCartIconCustom } from "@/components/Icons/ShoppingCartIcon";
import { useCommunityProjectsPaginated } from "@/hooks/useCommunityProjectsPaginated";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useDonationCart } from "@/store";
import type { CommunityProjectsV2Response } from "@/types/community";
import { projectV2ToGrant } from "@/utilities/adapters/projectV2ToGrant";
import { GrantCard } from "./GrantCard";
import { CardListSkeleton } from "./Pages/Communities/Loading";

interface CommunityGrantsDonateProps {
  initialProjects: CommunityProjectsV2Response;
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
                                  grant={projectV2ToGrant(project)}
                                  hideStats
                                  hideCategories
                                  cardClassName="rounded-lg"
                                  actionSlot={(() => {
                                    const inCart = items.some((i) => i.uid === project.uid);
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          toggle({
                                            uid: project.uid,
                                            title: project.details?.title || project.uid,
                                            slug: project.details?.slug,
                                            imageURL: project.details?.logoUrl,
                                          });
                                        }}
                                        className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm border ${
                                          inCart
                                            ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-200 hover:border-red-300"
                                            : "bg-[#F0FDF4] hover:bg-emerald-100 text-emerald-700 border-[#BDEFE2] hover:border-emerald-300"
                                        } hover:shadow-md`}
                                        aria-label={
                                          inCart
                                            ? "Remove from donation cart"
                                            : "Add to donation cart"
                                        }
                                      >
                                        <div
                                          className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 ${
                                            inCart ? "group-hover:rotate-90" : ""
                                          }`}
                                        >
                                          <ShoppingCartIconCustom
                                            className={inCart ? "text-red-700" : "text-emerald-700"}
                                          />
                                        </div>
                                        {inCart ? "Remove" : "Add to Cart"}
                                        {inCart && (
                                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        )}
                                      </button>
                                    );
                                  })()}
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
              Checkout ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};
