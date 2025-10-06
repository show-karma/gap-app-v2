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
import { ShoppingCartIcon } from "@heroicons/react/24/outline";

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
                                        onClick={(e) => {
                                          e.preventDefault();
                                          toggle({
                                            uid: project.uid,
                                            title: project.details?.title || project.uid,
                                            slug: project.details?.slug,
                                            imageURL: project.details?.logoUrl,
                                          });
                                        }}
                                        className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm border ${inCart
                                          ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-200 hover:border-red-300"
                                          : "bg-[#F0FDF4] hover:bg-emerald-100 text-emerald-700 border-[#BDEFE2] hover:border-emerald-300"
                                          } hover:shadow-md`}
                                        aria-label={inCart ? "Remove from donation cart" : "Add to donation cart"}
                                      >
                                        <div className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 ${inCart ? "group-hover:rotate-90" : ""
                                          }`}>
                                          {inCart ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                              <path d="M17.9797 4.59922C17.921 4.52901 17.8476 4.47254 17.7648 4.4338C17.6819 4.39506 17.5915 4.37498 17.5 4.375H4.89687L4.42187 1.76328C4.39571 1.61927 4.31984 1.48901 4.20748 1.39521C4.09512 1.30141 3.9534 1.25002 3.80703 1.25H1.875C1.70924 1.25 1.55027 1.31585 1.43306 1.43306C1.31585 1.55027 1.25 1.70924 1.25 1.875C1.25 2.04076 1.31585 2.19973 1.43306 2.31694C1.55027 2.43415 1.70924 2.5 1.875 2.5H3.28125L5.27812 13.4602C5.33695 13.7852 5.48059 14.0889 5.69453 14.3406C5.39925 14.6164 5.18613 14.9686 5.0788 15.3581C4.97146 15.7477 4.9741 16.1593 5.08643 16.5474C5.19876 16.9355 5.41638 17.2849 5.71518 17.5569C6.01397 17.8289 6.38225 18.0128 6.77918 18.0883C7.17612 18.1637 7.5862 18.1278 7.96394 17.9844C8.34169 17.841 8.67235 17.5958 8.91925 17.276C9.16615 16.9562 9.31965 16.5742 9.36273 16.1725C9.4058 15.7707 9.33677 15.3649 9.16328 15H12.7117C12.5719 15.2927 12.4995 15.6131 12.5 15.9375C12.5 16.3701 12.6283 16.7931 12.8687 17.1528C13.109 17.5125 13.4507 17.7929 13.8504 17.9585C14.2501 18.1241 14.6899 18.1674 15.1143 18.083C15.5386 17.9986 15.9284 17.7902 16.2343 17.4843C16.5402 17.1784 16.7486 16.7886 16.833 16.3643C16.9174 15.9399 16.8741 15.5001 16.7085 15.1004C16.5429 14.7007 16.2625 14.359 15.9028 14.1187C15.5431 13.8783 15.1201 13.75 14.6875 13.75H7.12266C6.97629 13.75 6.83457 13.6986 6.72221 13.6048C6.60985 13.511 6.53398 13.3807 6.50781 13.2367L6.26016 11.875H15.3227C15.7618 11.8749 16.1869 11.7208 16.524 11.4394C16.8611 11.158 17.0887 10.7672 17.1672 10.3352L18.1172 5.11172C18.1333 5.02144 18.1293 4.92872 18.1055 4.84015C18.0818 4.75158 18.0388 4.66933 17.9797 4.59922ZM8.125 15.9375C8.125 16.1229 8.07002 16.3042 7.967 16.4583C7.86399 16.6125 7.71757 16.7327 7.54627 16.8036C7.37496 16.8746 7.18646 16.8932 7.0046 16.857C6.82274 16.8208 6.6557 16.7315 6.52459 16.6004C6.39348 16.4693 6.30419 16.3023 6.26801 16.1204C6.23184 15.9385 6.25041 15.75 6.32136 15.5787C6.39232 15.4074 6.51248 15.261 6.66665 15.158C6.82082 15.055 7.00208 15 7.1875 15C7.43614 15 7.6746 15.0988 7.85041 15.2746C8.02623 15.4504 8.125 15.6889 8.125 15.9375ZM15.625 15.9375C15.625 16.1229 15.57 16.3042 15.467 16.4583C15.364 16.6125 15.2176 16.7327 15.0463 16.8036C14.875 16.8746 14.6865 16.8932 14.5046 16.857C14.3227 16.8208 14.1557 16.7315 14.0246 16.6004C13.8935 16.4693 13.8042 16.3023 13.768 16.1204C13.7318 15.9385 13.7504 15.75 13.8214 15.5787C13.8923 15.4074 14.0125 15.261 14.1667 15.158C14.3208 15.055 14.5021 15 14.6875 15C14.9361 15 15.1746 15.0988 15.3504 15.2746C15.5262 15.4504 15.625 15.6889 15.625 15.9375ZM15.9375 10.1117C15.9113 10.2561 15.835 10.3867 15.7222 10.4805C15.6094 10.5744 15.4671 10.6255 15.3203 10.625H6.03281L5.12422 5.625H16.7508L15.9375 10.1117Z" fill="#059669" />
                                            </svg>
                                          ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                              <path d="M17.9797 4.59922C17.921 4.52901 17.8476 4.47254 17.7648 4.4338C17.6819 4.39506 17.5915 4.37498 17.5 4.375H4.89687L4.42187 1.76328C4.39571 1.61927 4.31984 1.48901 4.20748 1.39521C4.09512 1.30141 3.9534 1.25002 3.80703 1.25H1.875C1.70924 1.25 1.55027 1.31585 1.43306 1.43306C1.31585 1.55027 1.25 1.70924 1.25 1.875C1.25 2.04076 1.31585 2.19973 1.43306 2.31694C1.55027 2.43415 1.70924 2.5 1.875 2.5H3.28125L5.27812 13.4602C5.33695 13.7852 5.48059 14.0889 5.69453 14.3406C5.39925 14.6164 5.18613 14.9686 5.0788 15.3581C4.97146 15.7477 4.9741 16.1593 5.08643 16.5474C5.19876 16.9355 5.41638 17.2849 5.71518 17.5569C6.01397 17.8289 6.38225 18.0128 6.77918 18.0883C7.17612 18.1637 7.5862 18.1278 7.96394 17.9844C8.34169 17.841 8.67235 17.5958 8.91925 17.276C9.16615 16.9562 9.31965 16.5742 9.36273 16.1725C9.4058 15.7707 9.33677 15.3649 9.16328 15H12.7117C12.5719 15.2927 12.4995 15.6131 12.5 15.9375C12.5 16.3701 12.6283 16.7931 12.8687 17.1528C13.109 17.5125 13.4507 17.7929 13.8504 17.9585C14.2501 18.1241 14.6899 18.1674 15.1143 18.083C15.5386 17.9986 15.9284 17.7902 16.2343 17.4843C16.5402 17.1784 16.7486 16.7886 16.833 16.3643C16.9174 15.9399 16.8741 15.5001 16.7085 15.1004C16.5429 14.7007 16.2625 14.359 15.9028 14.1187C15.5431 13.8783 15.1201 13.75 14.6875 13.75H7.12266C6.97629 13.75 6.83457 13.6986 6.72221 13.6048C6.60985 13.511 6.53398 13.3807 6.50781 13.2367L6.26016 11.875H15.3227C15.7618 11.8749 16.1869 11.7208 16.524 11.4394C16.8611 11.158 17.0887 10.7672 17.1672 10.3352L18.1172 5.11172C18.1333 5.02144 18.1293 4.92872 18.1055 4.84015C18.0818 4.75158 18.0388 4.66933 17.9797 4.59922ZM8.125 15.9375C8.125 16.1229 8.07002 16.3042 7.967 16.4583C7.86399 16.6125 7.71757 16.7327 7.54627 16.8036C7.37496 16.8746 7.18646 16.8932 7.0046 16.857C6.82274 16.8208 6.6557 16.7315 6.52459 16.6004C6.39348 16.4693 6.30419 16.3023 6.26801 16.1204C6.23184 15.9385 6.25041 15.75 6.32136 15.5787C6.39232 15.4074 6.51248 15.261 6.66665 15.158C6.82082 15.055 7.00208 15 7.1875 15C7.43614 15 7.6746 15.0988 7.85041 15.2746C8.02623 15.4504 8.125 15.6889 8.125 15.9375ZM15.625 15.9375C15.625 16.1229 15.57 16.3042 15.467 16.4583C15.364 16.6125 15.2176 16.7327 15.0463 16.8036C14.875 16.8746 14.6865 16.8932 14.5046 16.857C14.3227 16.8208 14.1557 16.7315 14.0246 16.6004C13.8935 16.4693 13.8042 16.3023 13.768 16.1204C13.7318 15.9385 13.7504 15.75 13.8214 15.5787C13.8923 15.4074 14.0125 15.261 14.1667 15.158C14.3208 15.055 14.5021 15 14.6875 15C14.9361 15 15.1746 15.0988 15.3504 15.2746C15.5262 15.4504 15.625 15.6889 15.625 15.9375ZM15.9375 10.1117C15.9113 10.2561 15.835 10.3867 15.7222 10.4805C15.6094 10.5744 15.4671 10.6255 15.3203 10.625H6.03281L5.12422 5.625H16.7508L15.9375 10.1117Z" fill="#059669" />
                                            </svg>
                                          )}
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
            className="box-border inline-flex items-center justify-center gap-3 px-7 py-4 relative rounded-[40px] overflow-hidden border border-solid border-grayprimary-700 bg-[linear-gradient(90deg,rgba(0,78,235,1)_0%,rgba(131,8,145,1)_80%)] text-white hover:opacity-80 transition-all duration-200"
          >
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
                <path d="M20.5756 4.51906C20.5052 4.43481 20.4172 4.36705 20.3177 4.32056C20.2182 4.27407 20.1098 4.24998 20 4.25H4.87625L4.30625 1.11594C4.27485 0.943126 4.1838 0.786814 4.04897 0.674254C3.91414 0.561694 3.74408 0.500025 3.56844 0.5H1.25C1.05109 0.5 0.860322 0.579018 0.71967 0.71967C0.579018 0.860322 0.5 1.05109 0.5 1.25C0.5 1.44891 0.579018 1.63968 0.71967 1.78033C0.860322 1.92098 1.05109 2 1.25 2H2.9375L5.33375 15.1522C5.40434 15.5422 5.57671 15.9067 5.83344 16.2087C5.47911 16.5397 5.22336 16.9623 5.09455 17.4298C4.96575 17.8972 4.96892 18.3912 5.10371 18.8569C5.23851 19.3226 5.49966 19.7419 5.85821 20.0683C6.21676 20.3947 6.6587 20.6154 7.13502 20.7059C7.61134 20.7965 8.10344 20.7533 8.55673 20.5813C9.01003 20.4092 9.40682 20.115 9.7031 19.7312C9.99938 19.3474 10.1836 18.889 10.2353 18.407C10.287 17.9249 10.2041 17.4379 9.99594 17H14.2541C14.0863 17.3513 13.9994 17.7357 14 18.125C14 18.6442 14.154 19.1517 14.4424 19.5834C14.7308 20.0151 15.1408 20.3515 15.6205 20.5502C16.1001 20.7489 16.6279 20.8008 17.1371 20.6996C17.6463 20.5983 18.114 20.3483 18.4812 19.9812C18.8483 19.614 19.0983 19.1463 19.1996 18.6371C19.3008 18.1279 19.2489 17.6001 19.0502 17.1205C18.8515 16.6408 18.515 16.2308 18.0834 15.9424C17.6517 15.654 17.1442 15.5 16.625 15.5H7.54719C7.37155 15.5 7.20149 15.4383 7.06665 15.3257C6.93182 15.2132 6.84077 15.0569 6.80937 14.8841L6.51219 13.25H17.3872C17.9141 13.2499 18.4243 13.0649 18.8288 12.7272C19.2333 12.3896 19.5064 11.9206 19.6006 11.4022L20.7406 5.13406C20.7599 5.02572 20.7551 4.91447 20.7266 4.80818C20.6981 4.7019 20.6466 4.60319 20.5756 4.51906ZM8.75 18.125C8.75 18.3475 8.68402 18.565 8.5604 18.75C8.43679 18.935 8.26109 19.0792 8.05552 19.1644C7.84995 19.2495 7.62375 19.2718 7.40552 19.2284C7.18729 19.185 6.98684 19.0778 6.8295 18.9205C6.67217 18.7632 6.56502 18.5627 6.52162 18.3445C6.47821 18.1262 6.50049 17.9 6.58563 17.6945C6.67078 17.4889 6.81498 17.3132 6.99998 17.1896C7.18499 17.066 7.4025 17 7.625 17C7.92337 17 8.20952 17.1185 8.42049 17.3295C8.63147 17.5405 8.75 17.8266 8.75 18.125ZM17.75 18.125C17.75 18.3475 17.684 18.565 17.5604 18.75C17.4368 18.935 17.2611 19.0792 17.0555 19.1644C16.85 19.2495 16.6238 19.2718 16.4055 19.2284C16.1873 19.185 15.9868 19.0778 15.8295 18.9205C15.6722 18.7632 15.565 18.5627 15.5216 18.3445C15.4782 18.1262 15.5005 17.9 15.5856 17.6945C15.6708 17.4889 15.815 17.3132 16 17.1896C16.185 17.066 16.4025 17 16.625 17C16.9234 17 17.2095 17.1185 17.4205 17.3295C17.6315 17.5405 17.75 17.8266 17.75 18.125ZM18.125 11.1341C18.0935 11.3074 18.0021 11.464 17.8666 11.5766C17.7312 11.6893 17.5605 11.7506 17.3844 11.75H6.23937L5.14906 5.75H19.1009L18.125 11.1341Z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold whitespace-nowrap">
              Checkout ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};
