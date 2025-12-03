/* eslint-disable @next/next/no-img-element */
"use client";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import type { Community } from "@show-karma/karma-gap-sdk";
import { useQuery } from "@tanstack/react-query";
import { blo } from "blo";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import CommunityStats from "@/components/CommunityStats";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";
import { AddAdmin } from "@/components/Pages/Admin/AddAdminDialog";
import { RemoveAdmin } from "@/components/Pages/Admin/RemoveAdminDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useGap } from "@/hooks/useGap";
import { useStaff } from "@/hooks/useStaff";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

const ADMINS_COLLAPSED_COUNT = 3;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());

  const { gap } = useGap();
  const { address } = useAccount();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const { communities: userAdminCommunities, isLoading: isLoadingUserCommunities } =
    useCommunitiesStore();

  const isStaffOrOwner = isOwner || isStaff;
  const hasAdminCommunities = userAdminCommunities.length > 0;
  const hasAccess = isStaffOrOwner || hasAdminCommunities;

  const fetchCommunitiesData = useCallback(async (): Promise<CommunitiesData> => {
    if (!gap) throw new Error("Gap not initialized");

    const result = await gap.fetch.communities();
    result.sort((a, b) => (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid));

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
    enabled: !!gap && hasAccess,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Filter communities based on user role
  const baseCommunities = useMemo(() => {
    if (isStaffOrOwner) {
      return allCommunities;
    } else if (hasAdminCommunities) {
      const userAdminUids = new Set(userAdminCommunities.map((c) => c.uid));
      return allCommunities.filter((c) => userAdminUids.has(c.uid));
    }
    return [];
  }, [allCommunities, isStaffOrOwner, hasAdminCommunities, userAdminCommunities]);

  // Get unique networks from communities
  const availableNetworks = useMemo(() => {
    const networks = new Map<number, string>();
    baseCommunities.forEach((c) => {
      if (!networks.has(c.chainID)) {
        networks.set(c.chainID, chainNameDictionary(c.chainID));
      }
    });
    return Array.from(networks.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [baseCommunities]);

  // Apply search and network filter
  const displayedCommunities = useMemo(() => {
    let filtered = baseCommunities;

    // Filter by network
    if (selectedNetwork !== "all") {
      filtered = filtered.filter((c) => c.chainID === Number(selectedNetwork));
    }

    // Filter by search query (community name only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const name = c.details?.name?.toLowerCase() || "";
        return name.includes(query);
      });
    }

    return filtered;
  }, [baseCommunities, searchQuery, selectedNetwork]);

  const toggleAdminExpansion = useCallback((communityUid: string) => {
    setExpandedAdmins((prev) => {
      const next = new Set(prev);
      if (!next.delete(communityUid)) {
        next.add(communityUid);
      }
      return next;
    });
  }, []);

  const isLoadingData =
    isLoading || isStaffLoading || (!isStaffOrOwner && isLoadingUserCommunities);

  const handleRefetch = useCallback(async () => {
    try {
      const result = await refetch();
      if (result.data) {
        setAllCommunities(result.data.communities);
        setCommunityAdmins(result.data.admins);
      }
    } catch (error: any) {
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

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="border border-zinc-300 rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm"
        >
          {/* Network skeleton */}
          <div className="mb-3">
            <div className="flex flex-row gap-2 items-center">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>

          {/* UUID skeleton */}
          <div className="mb-4">
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6 mt-1" />
          </div>

          {/* Links skeleton */}
          <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>

          {/* Admins skeleton */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={layoutTheme.padding}>
      {isLoadingData ? (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
          <div className="mt-5 w-full">
            <LoadingSkeleton />
          </div>
        </div>
      ) : hasAccess ? (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div className="text-2xl font-bold">
              {isStaffOrOwner ? "All Communities" : "Your Communities"}{" "}
              <span className="text-gray-500 dark:text-gray-400">
                ({displayedCommunities.length}
                {baseCommunities.length !== displayedCommunities.length &&
                  ` of ${baseCommunities.length}`}
                )
              </span>
            </div>
            {isStaffOrOwner && <CommunityDialog refreshCommunities={handleRefetch} />}
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by community name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Network Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="network-filter"
                className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
              >
                Network:
              </label>
              <select
                id="network-filter"
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Networks</option>
                {availableNetworks.map(([chainId, name]) => (
                  <option key={chainId} value={chainId}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 w-full">
            {displayedCommunities.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayedCommunities.map((community) => {
                  const matchingCommunityAdmin = communityAdmins.find(
                    (admin) => admin.id === community.uid
                  );
                  // TypeScript workaround for the 0x string format
                  const communityId = community.uid as unknown as `0x${string}`;

                  // Check if user is admin of this specific community
                  const isAdminOfThisCommunity = userAdminCommunities.some(
                    (userCommunity) => userCommunity.uid === community.uid
                  );

                  const canManageAdmins = isStaffOrOwner || isAdminOfThisCommunity;

                  return (
                    <div
                      key={community.uid}
                      className="border border-zinc-300 rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Network at top */}
                      <div className="mb-3">
                        <div className="flex flex-row gap-2 items-center">
                          <img
                            src={chainImgDictionary(community.chainID)}
                            alt={chainNameDictionary(community.chainID)}
                            className="w-5 h-5"
                          />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {chainNameDictionary(community.chainID)}
                          </p>
                        </div>
                      </div>

                      {/* Header with image and name */}
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={community.details?.imageURL || blo(community.uid)}
                          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                          alt={community.details?.name || community.uid}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {community.details?.name || "Unnamed Community"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Created {formatDate(community?.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* UUID */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">UUID</p>
                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                          {community.uid}
                        </p>
                      </div>

                      {/* Links & Stats */}
                      <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Links</p>
                        <div className="flex flex-col gap-2">
                          <Link
                            href={PAGES.COMMUNITY.ALL_GRANTS(
                              community.details?.slug || community.uid
                            )}
                            className="flex flex-row items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            <LinkIcon className="w-4 h-4" />
                            <span>Community Page</span>
                          </Link>
                          <Link
                            href={PAGES.ADMIN.ROOT(community.details?.slug || community.uid)}
                            className="flex flex-row items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            <LinkIcon className="w-4 h-4" />
                            <span>Admin Page</span>
                          </Link>
                          <div className="mt-1">
                            <CommunityStats communityId={community.uid} />
                          </div>
                        </div>
                      </div>

                      {/* Admins */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Admins{" "}
                            {matchingCommunityAdmin && matchingCommunityAdmin.admins.length > 0 && (
                              <span className="text-gray-400">
                                ({matchingCommunityAdmin.admins.length})
                              </span>
                            )}
                          </p>
                          {canManageAdmins && (
                            <AddAdmin
                              UUID={communityId}
                              chainid={community.chainID}
                              fetchAdmins={handleRefetch}
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          {matchingCommunityAdmin && matchingCommunityAdmin.admins.length > 0 ? (
                            <>
                              {(expandedAdmins.has(community.uid)
                                ? matchingCommunityAdmin.admins
                                : matchingCommunityAdmin.admins.slice(0, ADMINS_COLLAPSED_COUNT)
                              ).map((admin, index) => (
                                <div
                                  className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-zinc-800 rounded"
                                  key={index}
                                >
                                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                    {shortenHex(admin.user.id)}
                                  </span>
                                  {canManageAdmins && (
                                    <RemoveAdmin
                                      UUID={communityId}
                                      chainid={community.chainID}
                                      Admin={formatAdminAddress(admin.user.id)}
                                      fetchAdmins={handleRefetch}
                                    />
                                  )}
                                </div>
                              ))}
                              {matchingCommunityAdmin.admins.length > ADMINS_COLLAPSED_COUNT && (
                                <button
                                  type="button"
                                  onClick={() => toggleAdminExpansion(community.uid)}
                                  aria-expanded={expandedAdmins.has(community.uid)}
                                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                                >
                                  {expandedAdmins.has(community.uid) ? (
                                    <>
                                      <ChevronUpIcon className="w-3 h-3" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDownIcon className="w-3 h-3" />
                                      Show{" "}
                                      {matchingCommunityAdmin.admins.length -
                                        ADMINS_COLLAPSED_COUNT}{" "}
                                      more
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                              No admins yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                {searchQuery || selectedNetwork !== "all" ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-500 dark:text-gray-400">
                      No communities match your search
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedNetwork("all");
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    {isStaffOrOwner ? "No communities found" : MESSAGES.ADMIN.NO_COMMUNITIES}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
        </div>
      )}
    </div>
  );
}
