"use client";
/* eslint-disable @next/next/no-img-element */
import { FC, useEffect, useMemo, useState } from "react";
import { blo } from "blo";
import { Hex } from "viem";
import { useENS } from "@/store/ens";
import { shortAddress } from "@/utilities/shortAddress";
import { formatDate } from "@/utilities/formatDate";
import { EmptyEndorsmentList } from "../Project/Impact/EmptyEndorsmentList";
import { useProjectStore } from "@/store";
import pluralize from "pluralize";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { IProjectEndorsement } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useAccount } from "wagmi";
import { useAuthStore } from "@/store/auth";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useConnectModal } from "@rainbow-me/rainbowkit";

interface EndorsementRowProps {
  endorsement: IProjectEndorsement;
}

const EndorsementRow: FC<EndorsementRowProps> = ({ endorsement }) => {
  const { ensData, populateEns } = useENS();
  useEffect(() => {
    populateEns([endorsement.recipient]);
  }, [endorsement.recipient]);

  return (
    <div className="flex flex-col w-full p-4 gap-3">
      <div className="flex flex-row gap-2 w-full items-start">
        <div className="flex flex-row gap-2 w-full items-center">
          <EthereumAddressToENSAvatar
            address={endorsement.recipient}
            className="h-6 w-6 rounded-full"
          />
          <div className="flex flex-row gap-3 w-full items-start justify-between">
            <p className="text-sm font-bold text-brand-darkblue dark:text-zinc-100">
              {ensData[endorsement?.recipient]?.name ||
                shortAddress(endorsement.recipient)}
              {` `}
              <span className="text-sm font-normal text-brand-gray dark:text-zinc-200">
                endorsed this on {formatDate(endorsement.createdAt)}
              </span>
            </p>
          </div>
        </div>
      </div>
      {endorsement.data.comment ? (
        <div className="text-left px-0 flex flex-row items-start">
          <p className="text-sm text-brand-gray dark:text-zinc-100  font-normal">
            <div
              className="w-full break-normal text-base font-normal text-black dark:text-zinc-100 max-2xl:text-sm"
              data-color-mode="light"
            >
              <MarkdownPreview source={endorsement.data.comment} />
            </div>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export const EndorsementList: FC = () => {
  const project = useProjectStore((state) => state.project);
  const [handledEndorsements, setHandledEndorsements] = useState<
    IProjectEndorsement[]
  >([]);
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { populateEns } = useENS();
  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const { openConnectModal } = useConnectModal();

  const userHasEndorsed = useMemo(() => {
    if (!address || !isConnected || !isAuth || !project?.endorsements?.length)
      return false;
    return project.endorsements.some(
      (endorsement) =>
        endorsement.recipient?.toLowerCase() === address.toLowerCase()
    );
  }, [address, isConnected, isAuth, project?.endorsements]);

  useMemo(() => {
    const endorsements = project?.endorsements || [];
    const allAddresses = endorsements.map(
      (endorsement) => endorsement.recipient
    );
    populateEns(allAddresses);

    const checkUniqueEndorsements = () => {
      const addresses: Record<Hex, IProjectEndorsement> = {};
      endorsements.forEach((endorsement) => {
        if (addresses[endorsement.recipient]) {
          if (
            new Date(addresses[endorsement.recipient].createdAt) <
            new Date(endorsement.createdAt)
          ) {
            addresses[endorsement.recipient] = endorsement;
          }
        } else {
          addresses[endorsement.recipient] = endorsement;
        }
      });
      const uniqueEndorsements = Object.values(addresses);
      const ordered = uniqueEndorsements.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sliced = ordered.slice(0, itemsPerPage * page);
      const canLoadMore = uniqueEndorsements.length !== sliced.length;
      setHasMore(canLoadMore);
      setHandledEndorsements(sliced);
    };
    checkUniqueEndorsements();
  }, [project?.endorsements, page]);

  return (
    <div className="w-full flex flex-col gap-3">
      {handledEndorsements.length ? (
        <>
          <div className="flex flex-row gap-2 px-2 py-2 mb-[-20px] justify-start">
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <div>
                    <Button
                      onClick={() => {
                        if (isConnected) {
                          setIsOpen(true);
                        } else {
                          openConnectModal?.();
                        }
                      }}
                      className="whitespace-nowrap bg-brand-blue text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Endorse the project
                    </Button>
                  </div>
                </Tooltip.Trigger>
                {userHasEndorsed && (
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300 z-50"
                      sideOffset={5}
                      side="bottom"
                    >
                      <p>You have already endorsed this project.</p>
                      <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                )}
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
          <div className="flex flex-col gap-0 divide-y divide-y-gray-200  rounded-xl">
            {handledEndorsements.map((endorsement, index) => (
              <EndorsementRow key={index} endorsement={endorsement} />
            ))}
            {hasMore ? (
              <div className="w-full flex flex-row justify-center items-center py-2 px-4">
                <Button
                  onClick={() => {
                    setPage((old) => old + 1);
                  }}
                  className="w-max text-base bg-white border border-black dark:text-black dark:bg-black dark:border-white hover:bg-black dark:hover:bg-white"
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <EmptyEndorsmentList />
      )}
    </div>
  );
};
