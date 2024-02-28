/* eslint-disable @next/next/no-img-element */
import { Feed } from "@/types";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Spinner } from "./Utilities/Spinner";
import { ExternalLink } from "./Utilities/ExternalLink";
import { feedIconDictionary, getFeedHref } from "@/utilities/feed";
import { formatDate } from "@/utilities/formatDate";
import EthereumAddressToENSName from "./EthereumAddressToENSName";
import { blo } from "blo";
import { Hex } from "viem";
import { MarkdownPreview } from "./Utilities/MarkdownPreview";
import { cn } from "@/utilities";
import { useTheme } from "next-themes";
export const ProjectFeed = () => {
  const router = useRouter();
  const projectId = router.query.projectId; // Get the projectId from the URL

  const [feed, setFeed] = useState<Feed[]>([]); // Set the initial feed state to an empty array
  const [feedLoading, setFeedLoading] = useState<boolean>(true); // Set the initial loading state to true
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const [page, setPage] = useState<number>(1);
  const { theme } = useTheme();
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Fetch the feed data from the API

  // Call the feed API when the component loads
  useEffect(() => {
    const callFeedAPI = async () => {
      setFeedLoading(true);
      try {
        const [data, error, pageInfo]: any = await fetchData(
          `${INDEXER.PROJECT.FEED(projectId as string)}?limit=${itemsPerPage}`
        );
        if (!data || !data.length) return;
        const oldFeed = feed;
        const newFeed = data.slice(0, itemsPerPage * page);
        setFeed(newFeed);
        const canLoadMore = oldFeed.length !== newFeed.length;
        setHasMore(canLoadMore);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFeedLoading(false);
      }
    };

    if (projectId) {
      callFeedAPI();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [projectId, page]);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-lg font-bold text-zinc-700 max-2xl:text-base">
        Project Feed
      </div>
      {/* Feed start */}
      <div className="flow-root  bg-white dark:bg-zinc-900 dark:border-gray-700 border border-gray-200 py-2 rounded-xl  max-h-96 max-lg:max-h-64 max-lg:mt-4 overflow-y-auto">
        <ul>
          {feed.length ? (
            feed.map((item, index) => {
              return (
                <div
                  className="w-full flex flex-col"
                  key={item.uid + item.message + item.timestamp + item.type}
                >
                  <li
                    className={cn(
                      "relative  px-5 flex w-full flex-row items-center gap-3 py-4 max-2xl:px-3 max-sm:px-3"
                    )}
                  >
                    <div className="relative rounded-full bg-gray-100 p-2 text-gray-500 dark:bg-zinc-800 dark:text-zinc-200">
                      <img
                        alt={item.event}
                        src={feedIconDictionary(item.event, item.type)}
                        className="h-[20px] w-[20px] min-h-[20px] min-w-[20px] text-gray-500 stroke-gray-500 fill-gray-500 dark:text-gray-200 dark:stroke-gray-200 dark:fill-gray-200 max-md:h-[12px] max-md:w-[12px] max-md:min-h-[12px] max-md:min-w-[12px]"
                      />
                    </div>
                    <div className="feed remove-after flex w-full flex-col items-start gap-1">
                      <div
                        className="line-clamp-2 w-full break-normal text-base font-normal text-black dark:text-zinc-100 max-2xl:text-sm"
                        data-color-mode="light"
                      >
                        <MarkdownPreview
                          components={{
                            // eslint-disable-next-line react/no-unstable-nested-components
                            strong: ({ children }) => {
                              return (
                                <ExternalLink
                                  className="text-black font-bold hover:underline dark:text-zinc-100"
                                  href={getFeedHref(item)}
                                  style={{
                                    color: theme === "dark" ? "white" : "black",
                                  }}
                                >
                                  {children}
                                </ExternalLink>
                              );
                            },
                          }}
                          source={item.message}
                        />
                      </div>
                      <div className="flex flex-row items-center gap-1 flex-wrap">
                        <img
                          src={blo(item.attester as Hex, 8)}
                          alt={item.attester}
                          className="h-5 w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900"
                        />
                        <p className="text-sm text-center font-bold text-black dark:text-zinc-200 max-2xl:text-[13px]">
                          <EthereumAddressToENSName address={item.attester} />
                        </p>
                        <span className="ml-1 text-sm font-normal text-slate-700 dark:text-zinc-400 max-2xl:text-xs">
                          posted on {formatDate(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </li>
                  {index !== feed.length - 1 ? (
                    <div className="border-b border-b-gray-200 dark:border-b-gray-700"></div>
                  ) : null}
                </div>
              );
            })
          ) : feedLoading ? null : (
            <p className="text-base font-normal text-black dark:text-zinc-100 px-4">{`This project doesn't have any activity yet`}</p>
          )}
          {feed.length && hasMore ? (
            <li className="mx-5 flex items-center justify-center">
              <button
                onClick={() => {
                  setPage((oldValue) => oldValue + 1);
                }}
                className="h-max w-max my-4 py-2 px-6 bg-black dark:bg-slate-800 text-white rounded-md hover:opacity-75 transition-all ease-in-out duration-200"
              >
                {feedLoading ? (
                  <div className="w-full justify-center flex py-2">
                    <Spinner className="w-4 h-4" />
                  </div>
                ) : (
                  "See more"
                )}
              </button>
            </li>
          ) : null}
          {feedLoading && !feed.length ? (
            <div className="w-full justify-center flex py-2">
              <Spinner />
            </div>
          ) : null}
        </ul>
      </div>
      {/* Feed end */}
    </div>
  );
};
