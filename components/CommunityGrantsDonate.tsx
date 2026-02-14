"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { ProjectCartButton } from "@/components/Donation/ProjectCartButton";
import { ShoppingCartIcon as ShoppingCartIconCustom } from "@/components/Icons/ShoppingCartIcon";
import { useCommunityProjectsPaginated } from "@/hooks/useCommunityProjectsPaginated";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useDonationCart } from "@/store/donationCart";
import type { CommunityProjects } from "@/types/v2/community";
import { projectToGrant } from "@/utilities/adapters/v2/projectToGrant";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateWidth]);

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

  const MIN_CARD_WIDTH = 360;
  const MAX_COLUMNS_SMALL = 6;
  const MAX_COLUMNS_LARGE = 3;
  const gutterSize = 20;
  const calculatedColumns = Math.floor(width / MIN_CARD_WIDTH);
  const columnCounter = calculatedColumns
    ? isLargeViewport
      ? MAX_COLUMNS_LARGE
      : Math.min(calculatedColumns, MAX_COLUMNS_SMALL)
    : 1;
  const columnWidth = width > 0 ? Math.floor(width / columnCounter) : 0;
  const rowHeight = 240;
  const rowCount = Math.ceil(projects.length / columnCounter);

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
              <div ref={containerRef} style={{ width: "100%" }}>
                {width > 0 && (
                  <div
                    style={{
                      height: rowCount * rowHeight + 60,
                      width,
                      position: "relative",
                    }}
                  >
                    {Array.from({ length: rowCount }, (_, rowIndex) =>
                      Array.from({ length: columnCounter }, (_, columnIndex) => {
                        const project = projects[rowIndex * columnCounter + columnIndex];
                        const left = columnIndex * columnWidth + (columnIndex > 0 ? gutterSize : 0);
                        const top = rowIndex * rowHeight + (rowIndex > 0 ? gutterSize : 0);
                        const cellWidth = columnWidth - (columnIndex > 0 ? gutterSize : 0);
                        const cellHeight = rowHeight - (rowIndex > 0 ? gutterSize : 0);

                        return (
                          <div
                            key={`${rowIndex}-${columnIndex}`}
                            style={{
                              position: "absolute",
                              left,
                              top,
                              width: cellWidth,
                              height: cellHeight,
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
                      })
                    )}
                  </div>
                )}
              </div>
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
