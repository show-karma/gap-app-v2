import { ReadMore } from "@/utilities/ReadMore";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import Image from "next/image";
import { FC } from "react";

export type GrantProgram = {
  _id: {
    $oid: string;
  };
  name?: string;
  createdAtBlock?: string;
  createdByAddress?: string;
  metadata?: {
    tags?: string[];
    type?: string;
    title?: string;
    discord?: string;
    endDate?: string;
    logoImg?: string;
    website?: string;
    bounties?: string[];
    bannerImg?: string;
    createdAt?: number;
    grantSize?: string;
    startDate?: string;
    categories?: string[];
    ecosystems?: string[];
    networks?: string[];
    grantTypes?: string[];
    credentials?: {};
    description?: string;
    logoImgData?: string;
    grantsIssued?: number;
    bannerImgData?: string;
    linkToDetails?: string;
    programBudget?: string;
    projectTwitter?: string;
    applicantsNumber?: number;
    amountDistributedToDate?: string;
  };
  tags?: string[];
  updatedAtBlock?: string;
  projectNumber?: null;
  projectType?: string;
  registryAddress?: string;
  anchorAddress?: string;
  programId?: string;
  chainID?: number;
  isValid?: boolean;
  createdAt: {
    $timestamp: {
      t: number;
      i: number;
    };
  };
  updatedAt: {
    $timestamp: {
      t: number;
      i: number;
    };
  };
};

interface ProgramListProps {
  grantPrograms: GrantProgram[];
}

export const ProgramList: FC<ProgramListProps> = ({ grantPrograms }) => {
  return (
    <table className="min-w-full divide-y divide-gray-300 h-full">
      <thead>
        <tr className="">
          <th
            scope="col"
            className="py-3.5 pl-4 pr-3 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64"
          >
            Networks
          </th>

          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Name
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Description
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Budget
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Categories
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Start date
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            End date
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
          >
            Type
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 ">
        {grantPrograms.map((grant, index) => (
          <tr key={grant?.programId! + index}>
            <td>
              <div className="w-full max-w-52 grid-cols-2 grid gap-2">
                {grant.metadata?.networks?.map((network, index) => (
                  <span
                    key={index}
                    className="whitespace-nowrap px-3 py-1 text-[11px] truncate text-center w-full rounded-full text-blue-700 bg-[#EFF8FF] border border-[#B2DDFF] mr-2"
                  >
                    {network}
                  </span>
                ))}
              </div>
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300 text-wrap max-w-[285px]">
              <div className="flex flex-row gap-3">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-base text-gray-900 underline dark:text-zinc-100">
                    {grant?.metadata?.title}
                  </div>
                  {grant.metadata?.website ? (
                    <a
                      href={`https://grantname.xyz`}
                      className="font-semibold text-base text-blue-700"
                    >
                      {grant.metadata?.website}
                    </a>
                  ) : null}
                  {grant.metadata?.website ? (
                    <>
                      <Image
                        className="w-5 h-5 text-black dark:text-white dark:hidden"
                        width={20}
                        height={20}
                        src="/icons/globe.svg"
                        alt={grant.metadata?.website}
                      />
                      <Image
                        width={20}
                        height={20}
                        className="w-5 h-5 text-black dark:text-white hidden dark:block"
                        src="/icons/globe-white.svg"
                        alt={grant.metadata?.website}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-400 max-w-[285px]">
              <div
                className="w-[320px] max-w-[320px] text-wrap"
                data-color-mode="light"
              >
                <ReadMore
                  readLessText="Show less description"
                  readMoreText="Show full description"
                  side="left"
                  words={50}
                >
                  {grant.metadata?.description!}
                </ReadMore>
              </div>
            </td>{" "}
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              {grant?.metadata?.programBudget
                ? formatCurrency(+grant?.metadata?.programBudget) === "NaN"
                  ? grant?.metadata?.programBudget
                  : `$${formatCurrency(+grant?.metadata?.programBudget)}`
                : ""}
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              <div className="w-full flex flex-row flex-wrap gap-1">
                {grant.metadata?.categories?.map((category, index) => (
                  <span
                    key={index}
                    className="mr-1 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              {grant?.metadata?.startDate
                ? formatDate(grant?.metadata?.startDate)
                : ""}
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              {grant?.metadata?.endDate
                ? formatDate(grant?.metadata?.endDate)
                : ""}
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              {grant.metadata?.grantTypes?.map((category, index) => (
                <span
                  key={index}
                  className="mr-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                >
                  {category}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
