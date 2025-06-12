/* eslint-disable @next/next/no-img-element */
"use client";
import CommunityStats from "@/components/CommunityStats";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";
import { AddAdmin } from "@/components/Pages/Admin/AddAdminDialog";
import { RemoveAdmin } from "@/components/Pages/Admin/RemoveAdminDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { useGap } from "@/hooks/useGap";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { LinkIcon } from "@heroicons/react/24/solid";
import { Community } from "@show-karma/karma-gap-sdk";
import { blo } from "blo";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";

import { errorManager } from "@/components/Utilities/errorManager";

interface CommunityAdmin {
  id: string;
  admins: Array<{
    user: {
      id: string;
    };
  }>;
}

interface CommunitiesData {
  communities: Community[];
  admins: CommunityAdmin[];
}

export default function CommunitiesToAdminPage() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [communityAdmins, setCommunityAdmins] = useState<CommunityAdmin[]>([]);

  const { gap } = useGap();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  const hasAccess = isOwner || isStaff;

  const fetchCommunitiesData =
    useCallback(async (): Promise<CommunitiesData> => {
      if (!gap) throw new Error("Gap not initialized");

      const result = await gap.fetch.communities();
      result.sort((a, b) =>
        (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
      );

      const fetchPromises = result.map(async (community) => {
        try {
          const [data, error] = await fetchData(
            INDEXER.COMMUNITY.ADMINS(community.uid),
            "GET",
            {},
            {},
            {},
            false
          );

          if (!data) return { id: community.uid, admins: [] };
          if (error) throw Error(error);

          return data;
        } catch {
          return { id: community.uid, admins: [] };
        }
      });
      const communityAdmins = await Promise.all(fetchPromises);
      setAllCommunities(result || []);
      setCommunityAdmins(communityAdmins || []);
      return { communities: result, admins: communityAdmins };
    }, [gap]);

  const { isLoading, refetch } = useQuery({
    queryKey: ["communities", "admins"],
    queryFn: fetchCommunitiesData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const handleRefetch = useCallback(async () => {
    try {
      const result = await refetch();
      if (result.data) {
        setAllCommunities(result.data.communities);
        setCommunityAdmins(result.data.admins);
      }
    } catch (error: any) {
      console.log(error);
      errorManager(`Error refetching communities`, error);
    }
    return undefined;
  }, [refetch]);

  // Ensure address has 0x prefix
  const formatAdminAddress = (address: any): `0x${string}` => {
    if (isAddress(address)) {
      return address as `0x${string}`;
    }
    if (address.startsWith("0x") && address.length === 42) {
      return address as `0x${string}`;
    }
    // Return a default format if not a valid address (should not happen)
    return `0x${address.replace("0x", "")}` as `0x${string}`;
  };

  function shortenHex(hexString: string) {
    const firstPart = hexString.substring(0, 6);
    const lastPart = hexString.substring(hexString.length - 6);

    return `${firstPart}...${lastPart}`;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {isLoading ? (
        <Spinner />
      ) : hasAccess ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-2xl font-bold">
              All Communities{" "}
              {allCommunities.length ? `(${allCommunities.length})` : ""}
            </div>

            <CommunityDialog refreshCommunities={handleRefetch} />
          </div>
          <div className="mt-5 w-full gap-5">
            {allCommunities.length ? (
              <table className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                  <tr className="divide-x">
                    <th>Img</th>
                    <th>Name</th>
                    <th>Created</th>
                    <th>UUID</th>
                    <th className="px-4 text-center">Community page</th>
                    <th className="px-4 text-center">Admin page</th>
                    <th className="px-4 text-center">View stats</th>
                    <th>Network</th>
                    <th>Admins</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-x">
                  {allCommunities.map((community) => {
                    const matchingCommunityAdmin = communityAdmins.find(
                      (admin) => admin.id === community.uid
                    );
                    // TypeScript workaround for the 0x string format
                    const communityId =
                      community.uid as unknown as `0x${string}`;

                    return (
                      <React.Fragment key={community.uid}>
                        <tr className="divide-x">
                          <td>
                            <img
                              src={
                                community.details?.imageURL ||
                                blo(community.uid)
                              }
                              className="h-[64px] w-[100px] object-cover"
                              alt={community.details?.name || community.uid}
                            />
                          </td>
                          <td className="max-w-40 px-4">
                            {community.details?.name}
                          </td>
                          <td className="max-w-60 px-4">
                            {formatDate(community?.createdAt)}
                          </td>
                          <td className="max-w-80 break-all px-4">
                            {community.uid}
                          </td>
                          <td className="text-center px-4">
                            <Link
                              href={PAGES.COMMUNITY.ALL_GRANTS(
                                community.details?.slug || community.uid
                              )}
                              className="flex flex-row items-center gap-1.5 text-blue-500"
                            >
                              Community
                              <LinkIcon className="w-4 h-4" />
                            </Link>
                          </td>
                          <td className="text-center px-4">
                            <Link
                              href={PAGES.ADMIN.ROOT(
                                community.details?.slug || community.uid
                              )}
                              className="flex flex-row items-center gap-1.5 text-blue-500"
                            >
                              Admin
                              <LinkIcon className="w-4 h-4" />
                            </Link>
                          </td>
                          <td className="text-center px-4">
                            <CommunityStats communityId={community.uid} />
                          </td>
                          <td className="px-4">
                            <div className="flex flex-row gap-2 items-center">
                              <img
                                src={chainImgDictionary(community.chainID)}
                                alt={chainNameDictionary(community.chainID)}
                                className="w-5 h-5"
                              />
                              <p>{chainNameDictionary(community.chainID)}</p>
                            </div>
                          </td>
                          <td>
                            {matchingCommunityAdmin &&
                              matchingCommunityAdmin.admins.map(
                                (admin, index) => (
                                  <div className="flex gap-2 p-5" key={index}>
                                    <div>{shortenHex(admin.user.id)}</div>
                                    <RemoveAdmin
                                      UUID={communityId}
                                      chainid={community.chainID}
                                      Admin={formatAdminAddress(admin.user.id)}
                                      fetchAdmins={handleRefetch}
                                    />
                                  </div>
                                )
                              )}
                          </td>
                          <td>
                            <AddAdmin
                              UUID={communityId}
                              chainid={community.chainID}
                              fetchAdmins={handleRefetch}
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : isLoading ? (
              <Spinner />
            ) : null}
          </div>
        </div>
      ) : (
        <p>{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      )}
    </div>
  );
}
