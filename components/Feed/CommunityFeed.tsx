/* eslint-disable @next/next/no-img-element */
import { Feed } from "@/types";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import {
  ChatBubbleLeftEllipsisIcon,
  TagIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";
import { Spinner } from "../Utilities/Spinner";
import { ExternalLink } from "../Utilities/ExternalLink";
import { feedIconDictionary, getFeedHref } from "@/utilities/feed";
import { formatDate } from "@/utilities/formatDate";
import { blo } from "blo";
import { UserInfo } from "../Utilities/User";
import { MarkdownPreviewProps } from "@uiw/react-markdown-preview";
import dynamic from "next/dynamic";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MarkdownPreview = dynamic<MarkdownPreviewProps>(
  () => import("@uiw/react-markdown-preview"),
  {
    ssr: false,
  }
);

const activity = [
  {
    id: 1,
    type: "comment",
    person: { name: "Eduardo Benz", href: "#" },
    imageUrl:
      "https://images.unsplash.com/photo-1520785643438-5bf77931f493?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80",
    comment:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. ",
    date: "6d ago",
    account: "0x1234567890123456789012345678901234567890",
  },
  {
    id: 2,
    type: "assignment",
    person: { name: "Hilary Mahy", href: "#" },
    assigned: { name: "Kristin Watson", href: "#" },
    date: "2d ago",
    account: "0x1234567890123456789012345678901234567890",
  },
  {
    id: 3,
    type: "tags",
    person: { name: "Hilary Mahy", href: "#" },
    tags: [
      { name: "Bug", href: "#", color: "fill-red-500" },
      { name: "Accessibility", href: "#", color: "fill-primary-500" },
    ],
    date: "6h ago",
    account: "0x1234567890123456789012345678901234567890",
  },
  {
    id: 4,
    type: "comment",
    person: { name: "Jason Meyers", href: "#" },
    imageUrl:
      "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80",
    comment:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. Scelerisque amet elit non sit ut tincidunt condimentum. Nisl ultrices eu venenatis diam.",
    date: "2h ago",
    account: "0x1234567890123456789012345678901234567890",
  },
];

export const CommunityFeed = () => {
  const router = useRouter();
  const communityId = router.query.communityId; // Get the communityId from the URL

  const [feed, setFeed] = useState<Feed[]>([]); // Set the initial feed state to an empty array
  const [feedLoading, setFeedLoading] = useState<boolean>(true); // Set the initial loading state to true
  const itemsPerPage = 12; // Set the total number of items you want returned from the API

  // Fetch the feed data from the API

  // Call the feed API when the component loads
  useEffect(() => {
    const callFeedAPI = async () => {
      setFeedLoading(true);
      try {
        const [data, error, pageInfo]: any = await fetchData(
          `${INDEXER.COMMUNITY.FEED(
            communityId as string
          )}?limit=${itemsPerPage}`
        );
        console.log(data);
        setFeed(data.slice(0, itemsPerPage));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFeedLoading(false);
      }
    };

    if (communityId) {
      callFeedAPI();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [communityId]);

  return (
    <div className="w-3/12">
      <div className="text-xl font-bold">Community Feed</div>
      {/* Feed start */}
      <div className="flow-root mt-10 bg-white border border-gray-200 py-2 px-5 rounded-xl shadow-md max-h-96 overflow-y-auto">
        {feedLoading ? (
          <div className="w-full justify-center flex py-2">
            <Spinner />
          </div>
        ) : (
          <ul role="list">
            {feed.map((item, index) => {
              return (
                <li
                  key={item.uid + item.message + item.timestamp + item.type}
                  className="relative flex w-full flex-row items-center gap-3 py-4 max-2xl:px-3 max-sm:px-3"
                >
                  {index !== feed.length - 1 ? (
                    <span
                      className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative rounded-full bg-gray-100 p-2 text-gray-500">
                    <img
                      alt={item.event}
                      src={feedIconDictionary(item.event, item.type)}
                      className="h-[20px] w-[20px] text-gray-500 stroke-gray-500 fill-gray-500"
                    />
                  </div>
                  <div className="feed remove-after flex w-full flex-col items-start gap-1">
                    <div
                      className="line-clamp-2 w-full break-normal text-base font-normal text-black max-2xl:text-sm"
                      data-color-mode="light"
                    >
                      <MarkdownPreview
                        source={item.message}
                        components={{
                          // eslint-disable-next-line react/no-unstable-nested-components
                          strong: ({ children }) => {
                            return (
                              <ExternalLink
                                className="text-black font-bold"
                                href={getFeedHref(item)}
                                style={{
                                  color: "black",
                                }}
                              >
                                {children}
                              </ExternalLink>
                            );
                          },
                        }}
                        style={{
                          background: "none",
                        }}
                      />
                    </div>
                    {/* <p>{item.message}</p> */}
                    <div className="flex flex-row items-center gap-2">
                      <UserInfo
                        // attester={ensNames[item.attester as Hex]?.name || item.attester}
                        attester={item.attester}
                        spanNode={
                          <span className="ml-1 text-sm font-normal text-gray-500 max-2xl:text-xs">
                            posted on {formatDate(item.timestamp)}
                          </span>
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Feed end */}
    </div>
  );
};
