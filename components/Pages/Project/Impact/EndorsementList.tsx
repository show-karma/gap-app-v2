/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { FC, useEffect, useState } from "react";
import { blo } from "blo";
import { Hex } from "viem";
import { useENSNames } from "@/store/ensNames";
import { shortAddress } from "@/utilities/shortAddress";
import { formatDate } from "@/utilities/formatDate";
import { EmptyEndorsmentList } from "./EmptyEndorsmentList";

interface Endorsement {
  address: Hex;
  date: string;
  comment?: string;
}

interface EndorsementRowProps {
  endorsement: Endorsement;
}

const EndorsementRow: FC<EndorsementRowProps> = ({ endorsement }) => {
  const [openComment, setOpenComment] = useState(false);
  const { ensNames } = useENSNames();

  return (
    <div className="flex flex-col w-full p-4 gap-3">
      <div className="flex flex-row gap-2 w-full items-start">
        <div className="flex flex-row gap-2 w-full items-center">
          <img
            src={blo(endorsement.address, 6)}
            alt={endorsement.address}
            className="h-6 w-6 rounded-full"
          />
          <div className="flex flex-row gap-3 w-full items-start justify-between">
            <p className="text-sm font-bold text-[#101828]">
              {ensNames[endorsement?.address]?.name ||
                shortAddress(endorsement.address)}
              {` `}
              <span className="text-sm font-normal text-[#344054]">
                endorsed this on {formatDate(endorsement.date)}
              </span>
            </p>
          </div>
        </div>
        {endorsement.comment && (
          <button
            className="text-[#004EEB] font-semibold text-sm min-w-max w-max"
            onClick={() => setOpenComment(!openComment)}
          >
            {openComment ? "Hide" : "View"} comment
          </button>
        )}
      </div>
      {openComment && (
        <div className="text-left px-6 flex flex-row items-start">
          <p className="text-sm text-[#344054]  font-normal">
            {endorsement.comment}
          </p>
        </div>
      )}
    </div>
  );
};

export const EndorsementList: FC = () => {
  const endorsementNumber = 112;
  const endorsements: Endorsement[] = [
    {
      address: "0x2719B18f006C6f0DFE8296E15d07eAA295cf8EfD",
      date: "2023-09-01",
      comment: "I love this project!",
    },
    {
      address: "0xF3aB16880b414Cd94c151e3676c6898E0A569150",
      date: "2023-10-09",
    },
    {
      address: "0x0abF032f19D86e16b8163Ad999CB75fdD985Ea5F",
      date: "2024-10-01",
      comment: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`,
    },
    {
      address: "0xD1Ab925ebb77A823f52f7e4f1Ab0A7EAeD7c010D",
      date: "2024-10-02",
    },
  ];

  const orderEndorsements = endorsements.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const { populateEnsNames } = useENSNames();

  useEffect(() => {
    const allAddresses = endorsements.map((endorsement) => endorsement.address);
    populateEnsNames(allAddresses);
  }, [endorsements]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-row gap-2 justify-between items-center">
        <h3 className="font-bold text-[#101828] text-lg">Endorsements</h3>
        <div className="flex flex-row gap-2 items-center">
          <Image
            width={12}
            height={12}
            src="/icons/trending.svg"
            alt="Trending"
          />
          <p className="text-[#F79009] text-xs font-bold">
            This project has been endorsed {endorsementNumber} times
          </p>
        </div>
      </div>
      {true ? (
        <EmptyEndorsmentList />
      ) : (
        <div className="flex flex-col gap-0 divide-y divide-y-gray-200  rounded-xl border border-gray-200">
          {orderEndorsements.map((endorsement, index) => (
            <EndorsementRow key={index} endorsement={endorsement} />
          ))}
        </div>
      )}
    </div>
  );
};
