"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunitiesStore } from "@/store/communities";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";
import { Community } from "@show-karma/karma-gap-sdk";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useGap } from "@/hooks/useGap";
import { errorManager } from "@/components/Utilities/errorManager";
import { AddAdmin } from "./AddAdminDialog";
import { RemoveAdmin } from "./RemoveAdminDialog";
import { formatDate } from "@/utilities/formatDate";
import { blo } from "blo";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";
import { LinkIcon } from "@heroicons/react/24/solid";
import CommunityStats from "@/components/CommunityStats";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStaff } from "@/hooks/useStaff";

interface CommunityConfig {
  public?: boolean;
  rank?: number;
}

const useCommunityConfig = (slug: string, enabled: boolean = true) => {
  return useQuery<CommunityConfig | null>({
    queryKey: ["community-config", slug],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.CONFIG.GET(slug),
        "GET",
        {},
        {},
        {},
        false
      );
      return error ? null : data?.config || null;
    },
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

const useCommunityConfigMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { slug: string; config: CommunityConfig }, { previousConfig: CommunityConfig | null }>({
    mutationFn: async ({ slug, config }) => {
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.CONFIG.UPDATE(slug),
        "PUT",
        config,
        {},
        {},
        true // authenticated
      );
      if (error) throw new Error(error);
      return data;
    },
    onMutate: async ({ slug, config }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["community-config", slug] });
      
      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<CommunityConfig | null>(["community-config", slug]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["community-config", slug], config);
      
      // Return a context object with the snapshotted value
      return { previousConfig: previousConfig ?? null };
    },
    onError: (err, { slug }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConfig) {
        queryClient.setQueryData(["community-config", slug], context.previousConfig);
      }
    },
    onSettled: (_, __, { slug }) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["community-config", slug] });
    },
  });
};

export const CommunitiesToAdmin = () => {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [communityAdmins, setCommunityAdmins] = useState<any>([]);

  const { communities: communitiesToAdmin, isLoading } = useCommunitiesStore();
  const { gap } = useGap();
  const updateConfigMutation = useCommunityConfigMutation();
  const { isStaff } = useStaff();


  const fetchCommunities = async () => {
    try {
      if (!gap) throw new Error("Gap not initialized");

      const result = await gap.fetch.communities();
      result.sort((a, b) =>
        (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
      );
      setAllCommunities(result);

      console.log({ result });

      // Fetch admins data for ALL communities that will be shown
      const adminPromises = result.map(async (community) => {
        try {
          const [data, error] = await fetchData(
            INDEXER.COMMUNITY.ADMINS(community.uid),
            "GET",
            {},
            {},
            {},
            false
          );
          if (error || !data) return { id: community.uid, admins: [] };
          return data;
        } catch {
          return { id: community.uid, admins: [] };
        }
      });

      const communityAdmins = await Promise.all(adminPromises);

      console.log({ communityAdmins, communitiesToAdmin });

      setCommunityAdmins(communityAdmins);

      return result;
    } catch (error: any) {
      console.log(error);
      errorManager(`Error fetching all communities`, error);
      setAllCommunities([]);
      return undefined;
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {communitiesToAdmin.length === 0 ? (
        <p>{MESSAGES.ADMIN.NO_COMMUNITIES}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-2xl font-bold">
              Your Communities{" "}
              {allCommunities.length ? `(${communitiesToAdmin.length})` : ""}
            </div>
          </div>
          <div className="mt-5 w-full gap-5">
            {allCommunities.length ? (
              // Wrapping the table with a scrollable container
              <div className="overflow-x-auto">
                <table className="min-w-full border-x border-x-zinc-300 border-y border-y-zinc-300">
                  <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                    <tr className="divide-x">
                      <th className="min-w-[80px]">Img</th>
                      <th className="min-w-[150px]">Name</th>
                      <th className="min-w-[100px]">Created</th>
                      <th className="min-w-[200px]">UUID</th>{" "}
                      {/* Set minimum width */}
                      <th className="px-4 text-center min-w-[150px]">
                        Community page
                      </th>
                      <th className="px-4 text-center min-w-[120px]">
                        Admin page
                      </th>
                      <th className="px-4 text-center min-w-[120px]">
                        View stats
                      </th>
                      <th className="min-w-[150px]">Network</th>
                      <th className="min-w-[150px]">Admins</th>
                      <th className="min-w-[100px]">Action</th>
                      {isStaff && <th className="text-center">Public?</th>}
                      {isStaff && <th className="text-center">Rank</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-x">
                    {allCommunities.map((community) => {
                      const isCommunityAdmin = communitiesToAdmin.some(
                        (adminOfCommunity) =>
                          adminOfCommunity.uid === community.uid
                      );

                      if (!isCommunityAdmin) return null;

                      const matchingCommunityAdmin = communityAdmins.find(
                        (admin: any) => admin.id === community.uid
                      );

                      const slug = community.details?.slug || community.uid;

                      return (
                        <CommunityRowWithConfig
                          key={community.uid}
                          community={community}
                          slug={slug}
                          matchingCommunityAdmin={matchingCommunityAdmin}
                          fetchCommunities={fetchCommunities}
                          isStaff={isStaff}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : isLoading ? (
              <Spinner />
            ) : (
              <div className="text-center">
                <p>No communities to admin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CommunityRowWithConfigProps {
  community: Community;
  slug: string;
  matchingCommunityAdmin: any;
  fetchCommunities: () => Promise<Community[] | undefined>;
  isStaff: boolean;
}

const CommunityRowWithConfig: React.FC<CommunityRowWithConfigProps> = ({
  community,
  slug,
  matchingCommunityAdmin,
  fetchCommunities,
  isStaff
}) => {
  const updateConfigMutation = useCommunityConfigMutation();
  const { data: config, isLoading: configLoading } = useCommunityConfig(slug);

  // Debug logging
  console.log('CommunityRowWithConfig:', {
    communityName: community.details?.name,
    communityUID: community.uid,
    matchingCommunityAdmin,
    hasAdmins: matchingCommunityAdmin?.admins?.length > 0
  });

  function shortenHex(hexString: string) {
    const firstPart = hexString.substring(0, 6);
    const lastPart = hexString.substring(hexString.length - 6);

    return `${firstPart}...${lastPart}`;
  }

  const isPublic = config?.public === true || config?.public === undefined;
  const rank = config?.rank || 0;

  const handlePublicChange = (checked: boolean) => {
    updateConfigMutation.mutate({
      slug,
      config: {
        public: checked,
        rank: config?.rank
      }
    });
  };

  const handleRankChange = (newRank: number) => {
    updateConfigMutation.mutate({
      slug,
      config: {
        public: config?.public,
        rank: newRank
      }
    });
  };

  return (
    <React.Fragment>
      <tr className="divide-x">
        <td className="min-w-[80px]">
          <img
            src={community.details?.imageURL || blo(community.uid)}
            className="h-[64px] w-[100px] object-cover"
            alt={community.details?.name || community.uid}
          />
        </td>
        <td className="max-w-40 px-4 min-w-[150px]">
          {community.details?.name}
        </td>
        <td className="max-w-60 px-4 min-w-[100px]">
          {formatDate(community?.createdAt)}
        </td>
        <td className="max-w-80 break-all px-4 min-w-[200px]">
          {community.uid}
        </td>
        <td className="text-center px-4 min-w-[150px]">
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
        <td className="text-center px-4 min-w-[120px]">
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
        <td className="text-center px-4 min-w-[120px]">
          <CommunityStats communityId={community.uid} />
        </td>
        <td className="px-4 min-w-[150px]">
          <div className="flex flex-row gap-2 items-center">
            <img
              src={chainImgDictionary(community.chainID)}
              alt={chainNameDictionary(community.chainID)}
              className="w-5 h-5"
            />
            <p>{chainNameDictionary(community.chainID)}</p>
          </div>
        </td>
        <td className="min-w-[150px]">
          {matchingCommunityAdmin &&
            matchingCommunityAdmin.admins &&
            matchingCommunityAdmin.admins.length > 0 &&
            matchingCommunityAdmin.admins.map(
              (admin: any, index: number) => (
                <div className="flex gap-2 p-5" key={index}>
                  <div>
                    {shortenHex(admin.user.id)}
                  </div>
                  <RemoveAdmin
                    UUID={community.uid}
                    chainid={community.chainID}
                    Admin={admin.user.id}
                    fetchAdmins={fetchCommunities}
                  />
                </div>
              )
            )}
        </td>
        <td className="min-w-[100px]">
          <AddAdmin
            UUID={community.uid}
            chainid={community.chainID}
            fetchAdmins={fetchCommunities}
          />
        </td>
        {isStaff && (
          <td className="px-2 text-center">
            <div className="flex items-center justify-center gap-2">
              {configLoading ? (
                <div className="w-4 h-4 animate-spin border border-gray-300 rounded-full border-t-transparent" />
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => handlePublicChange(e.target.checked)}
                    disabled={updateConfigMutation.isPending}
                  />
                  {updateConfigMutation.isPending && (
                    <div className="w-3 h-3 animate-spin border border-blue-500 rounded-full border-t-transparent" />
                  )}
                </>
              )}
            </div>
          </td>
        )}
        {isStaff && (
          <td className="px-2 text-center">
            <div className="flex items-center justify-center gap-2">
              {configLoading ? (
                <div className="w-4 h-4 animate-spin border border-gray-300 rounded-full border-t-transparent" />
              ) : (
                <>
                  <input
                    type="number"
                    value={rank}
                    onChange={(e) => handleRankChange(parseInt(e.target.value) || 0)}
                    className="w-16 px-1 border border-gray-300 rounded text-center"
                    disabled={updateConfigMutation.isPending}
                  />
                  {updateConfigMutation.isPending && (
                    <div className="w-3 h-3 animate-spin border border-blue-500 rounded-full border-t-transparent" />
                  )}
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    </React.Fragment>
  );
};
