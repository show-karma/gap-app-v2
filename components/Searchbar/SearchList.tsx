/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import Link from "next/link";

import { Spinner } from "../Utilities/Spinner";
import EthereumAddressToENSName from "../EthereumAddressToENSName";
import { blo } from "blo";
import { PAGES } from "@/utilities/pages";
import {
  IProjectResponse,
  ICommunityResponse,
  ISearchResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAccount } from "wagmi";
import { useAuthStore } from "@/store/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useMobileStore } from "@/store/mobile";

interface Props {
  data: ISearchResponse; // Will be modular in the future
  isOpen: boolean;
  isLoading: boolean;
  closeSearchList: () => void;
}

export const SearchList: React.FC<Props> = ({
  data = { communities: [], projects: [] },
  isOpen = false,
  isLoading = true,
  closeSearchList,
}) => {
  const { isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const { openConnectModal } = useConnectModal();
  const [shouldOpen, setShouldOpen] = useState(false);

  const triggerCreateProjectModal = () => {
    if (!isConnected || !isAuth) {
      openConnectModal?.();
      setShouldOpen(true);
      return;
    }
    const el = document?.getElementById("new-project-button");
    if (el) el.click();
  };

  useEffect(() => {
    if (shouldOpen && isAuth && isConnected) {
      const el = document?.getElementById("new-project-button");
      if (el) el.click();
      setShouldOpen(false);
    }
  }, [isAuth, isConnected, shouldOpen]);
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileStore();

  const renderItem = (item: IProjectResponse | ICommunityResponse, title: string, href: string) => {
    return (
      <Link
        key={item.uid}
        href={href}
        onClick={() => {
          closeSearchList();
          setIsMobileMenuOpen(false);
        }}
      >
        <div className=":last:border-b-0 cursor-pointer select-none border-b border-slate-100 px-4 py-2 transition hover:bg-slate-200 dark:hover:bg-zinc-700">
          <b className="max-w-full text-ellipsis font-bold text-black dark:text-zinc-100">
            {title}
          </b>
          <br />
          <div className="text-gray-500 dark:text-gray-200">
            <div className="mt-3 flex items-center">
              <small className="mr-2">By</small>
              <div className="flex flex-row gap-1 items-center font-medium">
                <img
                  src={blo(item.recipient)}
                  className="w-4 h-4  rounded-full border-1 border-gray-100 dark:border-zinc-900"
                  alt="Recipient's Profile Picture"
                />
                <EthereumAddressToENSName address={item.recipient} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    isOpen && (
      <div className="absolute left-0 top-10 mt-3 max-h-64 min-w-full overflow-y-auto rounded-md bg-white dark:bg-zinc-800 py-4 border border-zinc-200">
        {data.projects.length > 0 &&
          data.projects.map((project) => (
            renderItem(
              project,
              project.details?.data.title || "Untitled Project",
              PAGES.PROJECT.GRANTS(project.details?.data.slug || project.uid)
            )
          ))
        }

        {data.communities.length > 0 &&
          data.communities.map((community) => (
            renderItem(
              community,
              community.details?.data.name || "Untitled Community",
              PAGES.COMMUNITY.ALL_GRANTS(community.details?.data.slug || community.uid)
            )
          ))
        }

        {isLoading && (
          <div className="flex justify-center ">
            <Spinner />
          </div>
        )}
        {!isLoading && data.projects.length === 0 && data.communities.length === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="w-full text-center">No results found.</div>
            <div
              onClick={() => triggerCreateProjectModal()}
              className="mt-2 cursor-pointer rounded-sm bg-brand-blue px-3 py-2 text-white font-bold"
            >
              Create a project
            </div>
          </div>
        )}
      </div>
    )
  );
};
