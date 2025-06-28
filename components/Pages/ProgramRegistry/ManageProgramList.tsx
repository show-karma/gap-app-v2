import { ReadMore } from "@/utilities/ReadMore";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import Image from "next/image";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { registryHelper } from "./helper";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Discord2Icon, Telegram2Icon, Twitter2Icon } from "@/components/Icons";
import { DiscussionIcon } from "@/components/Icons/Discussion";
import { BlogIcon } from "@/components/Icons/Blog";
import { OrganizationIcon } from "@/components/Icons/Organization";
import { Button } from "@/components/Utilities/Button";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GrantProgram } from "./ProgramList";
import { shortAddress } from "@/utilities/shortAddress";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useWallet } from "@/hooks/useWallet";

interface ManageProgramListProps {
  grantPrograms: GrantProgram[];
  approveOrReject: (
    program: GrantProgram,
    value: "accepted" | "rejected" | "pending"
  ) => Promise<void>;
  tab: "accepted" | "rejected" | "pending";
  editFn: (program: GrantProgram) => any;
  selectProgram: (program: GrantProgram) => void;
  isAllowed: boolean;
}

export const ManageProgramList: FC<ManageProgramListProps> = ({
  grantPrograms,
  approveOrReject,
  tab,
  editFn,
  selectProgram,
  isAllowed,
}) => {
  const { address } = useWallet();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);

  const defaultSort = searchParams.get("sortField") || "updatedAt";
  const defaultSortOrder = searchParams.get("sortOrder") || "desc";
  const [sortField, setSortField] = useQueryState("sortField", {
    defaultValue: defaultSort,
  });
  const [sortOrder, setSortOrder] = useQueryState("sortOrder", {
    defaultValue: defaultSortOrder,
  });

  const columns = useMemo<ColumnDef<GrantProgram>[]>(
    () => [
      {
        accessorFn: (row) => row,
        id: "Name",
        cell: (info) => {
          const grant = info.row.original;
          return (
            <div className="flex flex-1 w-full whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300 text-wrap max-w-[285px] mr-4">
              <div className="flex flex-col gap-1 w-max max-w-full">
                <button
                  type="button"
                  onClick={() => selectProgram(grant)}
                  className="text-left font-semibold text-base text-gray-900 underline dark:text-zinc-100 w-full"
                >
                  {grant?.metadata?.title}
                </button>
                <div className="flex flex-row gap-1 w-full">
                  {grant.metadata?.socialLinks?.grantsSite ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.grantsSite.includes("http")
                          ? grant.metadata?.socialLinks?.grantsSite
                          : `https://${grant.metadata?.socialLinks?.grantsSite}`
                      }
                      className="w-max"
                    >
                      <Image
                        className="w-5 h-5 text-black dark:text-white dark:hidden"
                        width={20}
                        height={20}
                        src="/icons/globe.svg"
                        alt={grant.metadata?.socialLinks?.grantsSite}
                      />
                      <Image
                        width={20}
                        height={20}
                        className="w-5 h-5 text-black dark:text-white hidden dark:block"
                        src="/icons/globe-white.svg"
                        alt={grant.metadata?.socialLinks?.grantsSite}
                      />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.twitter ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.twitter.includes("http")
                          ? grant.metadata?.socialLinks?.twitter
                          : `https://${grant.metadata?.socialLinks?.twitter}`
                      }
                      className="w-max"
                    >
                      <Twitter2Icon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.discord ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.discord.includes("http")
                          ? grant.metadata?.socialLinks?.discord
                          : `https://${grant.metadata?.socialLinks?.discord}`
                      }
                      className="w-max"
                    >
                      <Discord2Icon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.telegram ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.telegram.includes("http")
                          ? grant.metadata?.socialLinks?.telegram
                          : `https://${grant.metadata?.socialLinks?.telegram}`
                      }
                      className="w-max"
                    >
                      <Telegram2Icon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.forum ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.forum.includes("http")
                          ? grant.metadata?.socialLinks?.forum
                          : `https://${grant.metadata?.socialLinks?.forum}`
                      }
                      className="w-max"
                    >
                      <DiscussionIcon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.blog ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.blog.includes("http")
                          ? grant.metadata?.socialLinks?.blog
                          : `https://${grant.metadata?.socialLinks?.blog}`
                      }
                      className="w-max"
                    >
                      <BlogIcon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                  {grant.metadata?.socialLinks?.orgWebsite ? (
                    <ExternalLink
                      href={
                        grant.metadata?.socialLinks?.orgWebsite.includes("http")
                          ? grant.metadata?.socialLinks?.orgWebsite
                          : `https://${grant.metadata?.socialLinks?.orgWebsite}`
                      }
                      className="w-max"
                    >
                      <OrganizationIcon className="w-5 h-5 text-black dark:text-white" />
                    </ExternalLink>
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
        header: () => (
          //<button
          //  type="button"
          //  className="flex items-center gap-1"
          //  onClick={() => {
          //    setSortField("name");
          //    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          //  }}
          //>
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64 cursor-pointer">
            Name
          </div>
          //   <div className="flex flex-col items-center gap-0.5">
          //     {sortOrder === "asc" && (
          //       <ChevronUpIcon className="w-4 h-4 inline-block" />
          //     )}
          //     {sortOrder === "desc" && <ChevronDownIcon className="w-4 h-4" />}
          //   </div>
          // </button>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Description",
        cell: (info) => {
          const grant = info.row.original;
          return (
            <div className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-400 max-w-[240px]">
              <div
                className="w-[360px] max-w-[360px] text-wrap pr-8"
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
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left w-[420px] text-sm font-bold text-gray-900 dark:text-zinc-100 font-body">
            Description
          </div>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Start date",
        cell: (info) => {
          const program = info.row.original;
          const startsAt = program.metadata?.startsAt;
          return (
            <div className="w-full flex flex-row flex-wrap gap-1 my-2 items-center">
              {startsAt ? formatDate(startsAt) : null}
            </div>
          );
        },
        header: () => (
          // <button
          // type="button"
          // className="flex items-center gap-1"
          // onClick={() => {
          // setSortField("startsAt");
          // setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          // }}
          // >
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64 cursor-pointer">
            Start Date
          </div>
          //    <div className="flex flex-col items-center gap-0.5">
          //      {sortOrder === "asc" && (
          //        <ChevronUpIcon className="w-4 h-4 inline-block" />
          //      )}
          //      {sortOrder === "desc" && <ChevronDownIcon className="w-4 h-4" />}
          //    </div>
          //  </button>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "End date",
        cell: (info) => {
          const program = info.row.original;
          const endsAt = program.metadata?.endsAt;
          return (
            <div className="w-full flex flex-row flex-wrap gap-1 my-2 items-center">
              {endsAt ? formatDate(endsAt) : null}
            </div>
          );
        },
        header: () => (
          // <button
          //   type="button"
          //   className="flex items-center gap-1"
          //   onClick={() => {
          //     setSortField("endsAt");
          //     setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          //   }}
          // >
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64 cursor-pointer">
            End Date
          </div>
          //   <div className="flex flex-col items-center gap-0.5">
          //    {sortOrder === "asc" && (
          //      <ChevronUpIcon className="w-4 h-4 inline-block" />
          //    )}
          //    {sortOrder === "desc" && <ChevronDownIcon className="w-4 h-4" />}
          //  </div>
          //</button>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Networks",
        cell: (info) => {
          const grant = info.row.original;
          const networks = grant.metadata?.networks;
          const firstNetworks = networks?.slice(0, 4);
          const restNetworks = networks?.slice(4);
          if (
            !firstNetworks ||
            typeof firstNetworks === "string" ||
            typeof restNetworks === "string"
          )
            return null;
          return (
            <div className="w-full max-w-44 flex flex-row flex-wrap gap-1 my-2 items-center">
              {firstNetworks?.map((network, index) => (
                <Tooltip.Provider key={network}>
                  <Tooltip.Root delayDuration={0.5}>
                    <Tooltip.Trigger asChild>
                      <div className="w-7 h-7 rounded-full flex justify-center items-center">
                        {registryHelper.networkImages[network.toLowerCase()] ? (
                          <>
                            <Image
                              width={20}
                              height={20}
                              src={
                                registryHelper.networkImages[
                                  network.toLowerCase()
                                ].light
                              }
                              alt={network}
                              className="rounded-full w-5 h-5  dark:hidden"
                            />
                            <Image
                              width={20}
                              height={20}
                              src={
                                registryHelper.networkImages[
                                  network.toLowerCase()
                                ].dark
                              }
                              alt={network}
                              className="rounded-full w-5 h-5  hidden dark:block"
                            />
                          </>
                        ) : (
                          <div className="w-7 h-7 rounded-full flex justify-center items-center bg-gray-500" />
                        )}
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px]"
                        sideOffset={5}
                        side="bottom"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-row gap-2 items-center">
                            {registryHelper.networkImages[
                              network.toLowerCase()
                            ] ? (
                              <Image
                                width={16}
                                height={16}
                                src={
                                  registryHelper.networkImages[
                                    network.toLowerCase()
                                  ].dark
                                }
                                alt={network}
                                className="rounded-full w-4 h-4"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full flex justify-center items-center bg-gray-500" />
                            )}
                            <p className="text-sm text-white" key={network}>
                              {network}
                            </p>
                          </div>
                        </div>
                        <Tooltip.Arrow className="TooltipArrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              ))}
              {restNetworks?.length ? (
                <Tooltip.Provider>
                  <Tooltip.Root delayDuration={0.5}>
                    <Tooltip.Trigger asChild>
                      <p
                        key={grant.programId}
                        className="whitespace-nowrap rounded-full w-6 h-6 items-center flex flex-col justify-center px-1 py-1 text-[11px] truncate text-center text-blue-700 bg-[#EFF8FF] border border-[#B2DDFF] mr-2"
                      >
                        +{restNetworks.length}
                      </p>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px]"
                        sideOffset={5}
                        side="bottom"
                      >
                        <div className="flex flex-col gap-3">
                          {restNetworks.map((item) => (
                            <div
                              key={item}
                              className="flex flex-row gap-2 items-center"
                            >
                              {registryHelper.networkImages[
                                item.toLowerCase()
                              ] ? (
                                <Image
                                  width={16}
                                  height={16}
                                  src={
                                    registryHelper.networkImages[
                                      item.toLowerCase()
                                    ].dark
                                  }
                                  alt={item}
                                  className="rounded-full w-4 h-4"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full flex justify-center items-center bg-gray-500" />
                              )}
                              <p className="text-sm text-white" key={item}>
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                        <Tooltip.Arrow className="TooltipArrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              ) : null}
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64">
            Networks
          </div>
        ),
      },
      {
        accessorFn: (row) => (row.createdAt ? row.createdAt : null),
        id: "Date Added",
        cell: (info) => {
          const program = info.row.original;

          return (
            <div className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
              {program?.createdAt ? formatDate(program?.createdAt) : ""}
            </div>
          );
        },
        header: () => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => {
              setSortField("createdAt");
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            }}
          >
            <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64 cursor-pointer">
              Date Added
            </div>
            <div className="flex flex-col items-center gap-0.5">
              {sortOrder === "asc" && (
                <ChevronUpIcon className="w-4 h-4 inline-block" />
              )}
              {sortOrder === "desc" && <ChevronDownIcon className="w-4 h-4" />}
            </div>
          </button>
        ),
      },
      // {
      //   accessorFn: (row) => row,
      //   id: "Grant Size",
      //   cell: (info) => {
      //     const grant = info.row.original;

      //     return (
      //       <div className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
      //         {grant?.metadata?.minGrantSize && grant?.metadata?.maxGrantSize
      //           ? `$${formatCurrency(
      //               +grant?.metadata?.minGrantSize
      //             )} - $${formatCurrency(+grant?.metadata?.maxGrantSize)}`
      //           : ""}
      //       </div>
      //     );
      //   },
      //   header: () => (
      //     <div className="px-3 py-3.5 text-left text-sm w-[120px] font-bold text-gray-900 dark:text-zinc-100 font-body">
      //       Grant Size
      //     </div>
      //   ),
      // },
      {
        accessorFn: (row) => row,
        id: "Categories",
        accessorKey: "metadata.categories",
        cell: (info) => {
          const grant = info.row.original;

          return (
            <div className="w-full flex flex-row flex-wrap gap-1">
              {grant.metadata?.categories?.map((category, index) => (
                <span
                  key={`${category}${grant.programId}`}
                  className="mr-1 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                >
                  {category}
                </span>
              ))}
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64">
            Categories
          </div>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Types",
        cell: (info) => {
          const grant = info.row.original;

          return (
            <div className="whitespace-nowrap max-w-[220px] flex flex-row flex-wrap gap-1 px-3 py-5 text-sm text-black dark:text-zinc-300">
              {grant.metadata?.grantTypes?.map((type, index) => (
                <span
                  key={index}
                  className="mr-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                >
                  {type}
                </span>
              ))}
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64">
            Types
          </div>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Admins",
        cell: (info) => {
          const program = info.row.original;

          return (
            <div className="whitespace-nowrap max-w-[220px] flex flex-row flex-wrap gap-1 px-3 py-5 text-sm text-black dark:text-zinc-300">
              {program.admins?.map((admin, index) => (
                <span
                  key={index}
                  className={`mr-1 inline-flex items-center rounded-md  px-2 py-1 text-xs font-medium text-black ring-1 ring-inset ring-zinc-600/20 ${
                    admin.toLowerCase() === address?.toLowerCase()
                      ? "bg-blue-100"
                      : "bg-zinc-50"
                  }`}
                >
                  {shortAddress(admin.toLowerCase())}
                </span>
              ))}
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body max-w-64">
            Admins
          </div>
        ),
      },
      {
        accessorFn: (row) => row,
        id: "Action",

        cell: (info) => {
          const grant = info.row.original;

          const EditButton = () => {
            return (
              <Button
                className="text-sm bg-black dark:bg-black hover:bg-black text-white"
                onClick={() => {
                  editFn(grant);
                }}
              >
                Update
              </Button>
            );
          };

          const PendingButton = () => (
            <Button
              className="text-sm bg-zinc-700 dark:bg-zinc-700 hover:bg-zinc-700 text-white"
              onClick={() => {
                if (grant) {
                  approveOrReject(grant, "pending");
                }
              }}
            >
              Pending
            </Button>
          );
          const RejectButton = () => (
            <Button
              onClick={() => {
                if (grant) {
                  approveOrReject(grant, "rejected");
                }
              }}
              className="bg-red-600 hover:bg-red-600 text-sm"
            >
              Reject
            </Button>
          );
          const ApproveButton = () => (
            <Button
              className="text-sm bg-blue-700 dark:bg-blue-700 hover:bg-blue-700 text-white"
              onClick={() => {
                if (grant) {
                  approveOrReject(grant, "accepted");
                }
              }}
            >
              Approve
            </Button>
          );

          const statusCases = () => {
            if (tab === "accepted") {
              return (
                <>
                  <EditButton />
                  <PendingButton />
                  <RejectButton />
                </>
              );
            }
            if (tab === "rejected") {
              return (
                <>
                  <EditButton />
                  <PendingButton />
                  <ApproveButton />
                </>
              );
            }
            return (
              <>
                <EditButton />
                <ApproveButton />
                <RejectButton />
              </>
            );
          };

          return (
            <div className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300 w-48">
              {isAllowed ? (
                <div className="flex flex-row flex-wrap gap-3">
                  {statusCases()}
                </div>
              ) : null}
            </div>
          );
        },
        header: () => (
          <div className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body">
            Action
          </div>
        ),
      },
    ],
    [grantPrograms, isAllowed]
  );

  const table = useReactTable({
    data: grantPrograms,
    columns: columns as any,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
  });

  const parentRef = useRef(null);

  return (
    <div ref={parentRef} className="w-full">
      <div
        style={{
          width: "100%",
          minHeight: "100%",
          overflow: "hidden",
        }}
      >
        <table className="min-w-full divide-y divide-gray-300 h-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 ">
            {virtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = rows[virtualRow.index] as Row<GrantProgram>;
              return (
                <tr
                  key={row.id}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - index * virtualRow.size
                    }px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
