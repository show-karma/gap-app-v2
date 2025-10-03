"use client";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { CommunityProjectsV2Response } from "@/types/community";
import { projectV2ToGrant } from "@/utilities/adapters/projectV2ToGrant";
import { GrantCard } from "./GrantCard";
import { CardListSkeleton } from "./Pages/Communities/Loading";
import { useDonationCart } from "@/store";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { DonationProgramDropdown } from "./Donation/ProgramDropdown";
import { useCommunityProjectsPaginated } from "@/hooks/useCommunityProjectsPaginated";

interface CommunityGrantsDonateProps {
  initialProjects: CommunityProjectsV2Response;
}

export const CommunityGrantsDonate = ({ initialProjects }: CommunityGrantsDonateProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const programId = params.programId as string;
  const { items, toggle } = useDonationCart();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCommunityProjectsPaginated({
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
      {/* Header with Program Dropdown and Cart */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <DonationProgramDropdown />

        {items.length > 0 && (
          <Link
            href={PAGES.COMMUNITY.DONATE_PROGRAM_CHECKOUT(communityId, programId)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Cart ({items.length})
          </Link>
        )}
      </div>

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
                  const columns = Math.floor(width / 360);
                  const columnCounter = columns ? (columns > 6 ? 6 : columns) : 1;
                  const columnWidth = Math.floor(width / columnCounter);
                  const gutterSize = 20;
                  const height = Math.ceil(projects.length / columnCounter) * 360;
                  return (
                    <Grid
                      key={`grid-${width}-${columnCounter}`}
                      height={height + 60}
                      width={width}
                      rowCount={Math.ceil(projects.length / columnCounter)}
                      rowHeight={360}
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
                                  actionSlot={(() => {
                                    const inCart = items.some((i) => i.uid === project.uid);
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          toggle({
                                            uid: project.uid,
                                            title: project.details?.title || project.uid,
                                            slug: project.details?.slug,
                                            imageURL: project.details?.logoUrl,
                                          });
                                        }}
                                        className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm border ${
                                          inCart 
                                            ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300" 
                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300"
                                        } hover:shadow-md hover:scale-[1.02]`}
                                        aria-label={inCart ? "Remove from donation cart" : "Add to donation cart"}
                                      >
                                        <div className={`w-4 h-4 flex items-center justify-center transition-transform duration-200 ${
                                          inCart ? "group-hover:rotate-90" : "group-hover:scale-110"
                                        }`}>
                                          {inCart ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M3 6h18l-2 13H5L3 6z"/>
                                              <path d="M8 21h8"/>
                                              <path d="m16 8-4-4-4 4"/>
                                            </svg>
                                          ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M3 6h18l-2 13H5L3 6z"/>
                                              <path d="M8 21h8"/>
                                              <path d="m12 8v8"/>
                                              <path d="m8 12 4 4 4-4"/>
                                            </svg>
                                          )}
                                        </div>
                                        {inCart ? "Remove" : "Add to Cart"}
                                        {inCart && (
                                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
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
          {(isLoading || isFetchingNextPage) ? (
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
            className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M3 6h18l-2 13H5L3 6z"/>
                <path d="M8 21h8"/>
              </svg>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-bounce">
                {items.length}
              </div>
            </div>
            <span className="font-semibold whitespace-nowrap">
              Checkout ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-1">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};
