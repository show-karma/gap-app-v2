"use client";
/* eslint-disable @next/next/no-img-element */
import { type FC, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useProjectStore } from "@/store";
import { useENS } from "@/store/ens";
import { formatDate } from "@/utilities/formatDate";
import { shortAddress } from "@/utilities/shortAddress";
import { EmptyEndorsmentList } from "../Project/Impact/EmptyEndorsmentList";

// V2 API endorsement structure
interface ProjectEndorsementV2 {
  uid: string;
  endorsedBy: Hex;
  comment?: string;
  createdAt: string;
}

interface EndorsementRowProps {
  endorsement: ProjectEndorsementV2;
}

const EndorsementRow: FC<EndorsementRowProps> = ({ endorsement }) => {
  const { ensData, populateEns } = useENS();
  const endorserAddress = endorsement.endorsedBy?.toLowerCase() as Hex;

  useEffect(() => {
    if (endorsement.endorsedBy) {
      populateEns([endorsement.endorsedBy]);
    }
  }, [endorsement.endorsedBy, populateEns]);

  const displayName = ensData[endorserAddress]?.name || shortAddress(endorsement.endorsedBy);

  return (
    <div className="flex flex-col w-full p-4 gap-3">
      <div className="flex flex-row gap-2 w-full items-start">
        <div className="flex flex-row gap-2 w-full items-center">
          <EthereumAddressToENSAvatar
            address={endorsement.endorsedBy}
            className="h-6 w-6 rounded-full"
          />
          <div className="flex flex-row gap-3 w-full items-start justify-between">
            <p className="text-sm font-bold text-brand-darkblue dark:text-zinc-100">
              {displayName}
              {` `}
              <span className="text-sm font-normal text-brand-gray dark:text-zinc-200">
                endorsed this on {formatDate(endorsement.createdAt)}
              </span>
            </p>
          </div>
        </div>
      </div>
      {endorsement.comment ? (
        <div className="text-left px-0 flex flex-row items-start">
          <div
            className="text-sm text-brand-gray dark:text-zinc-100 font-normal w-full break-normal text-base text-black dark:text-zinc-100 max-2xl:text-sm"
            data-color-mode="light"
          >
            <MarkdownPreview source={endorsement.comment} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const EndorsementList: FC = () => {
  const project = useProjectStore((state) => state.project);
  const [handledEndorsements, setHandledEndorsements] = useState<ProjectEndorsementV2[]>([]);
  const itemsPerPage = 12;
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { populateEns } = useENS();

  useMemo(() => {
    const endorsements = (project?.endorsements || []) as ProjectEndorsementV2[];
    const allAddresses = endorsements.map((endorsement) => endorsement.endorsedBy);
    populateEns(allAddresses);

    const checkUniqueEndorsements = () => {
      const addresses: Record<Hex, ProjectEndorsementV2> = {};
      endorsements.forEach((endorsement) => {
        if (addresses[endorsement.endorsedBy]) {
          if (
            new Date(addresses[endorsement.endorsedBy].createdAt) < new Date(endorsement.createdAt)
          ) {
            addresses[endorsement.endorsedBy] = endorsement;
          }
        } else {
          addresses[endorsement.endorsedBy] = endorsement;
        }
      });
      const uniqueEndorsements = Object.values(addresses);
      const ordered = uniqueEndorsements.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sliced = ordered.slice(0, itemsPerPage * page);
      const canLoadMore = uniqueEndorsements.length !== sliced.length;
      setHasMore(canLoadMore);
      setHandledEndorsements(sliced);
    };
    checkUniqueEndorsements();
  }, [project?.endorsements, page, populateEns]);

  return (
    <div className="w-full flex flex-col gap-3">
      {handledEndorsements.length ? (
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
      ) : (
        <EmptyEndorsmentList />
      )}
    </div>
  );
};
