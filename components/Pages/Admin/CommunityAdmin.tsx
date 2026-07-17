"use client";
import {
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";
import { CommunityAdminCard } from "@/components/Pages/Admin/CommunityAdminCard";
import { CommunityAdminLoadingSkeleton } from "@/components/Pages/Admin/CommunityAdminLoadingSkeleton";
import { errorManager } from "@/components/Utilities/errorManager";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAuth } from "@/hooks/useAuth";
import {
  type CommunityAdmin,
  getCommunities,
  getCommunityAdminsBatch,
} from "@/services/communities.service";
import { communityAdminsService } from "@/services/community-admins.service";
import { Link } from "@/src/components/navigation/Link";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { communityAdminDenial } from "@/src/components/ui/access-denied-presets";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import type { Community } from "@/types/v2/community";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

interface CommunitiesData {
  communities: Community[];
  admins: CommunityAdmin[];
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded" />
      </div>
      <div className="mt-5 w-full">
        <CommunityAdminLoadingSkeleton />
      </div>
    </div>
  );
}

export default function CommunitiesToAdminPage() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [communityAdmins, setCommunityAdmins] = useState<CommunityAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const { authenticated, address, ready } = useAuth();

  // Lazy-load admin communities only on /admin — React Query dedupes the
  // fetch with other pages that need this data (FundingContent, etc.).
  useAdminCommunities(address);

  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles?.roles?.includes(Role.SUPER_ADMIN) ?? false;
  const userAdminCommunities = useCommunitiesStore((s) => s.communities);
  const isLoadingUserCommunities = useCommunitiesStore((s) => s.isLoading);

  const isSuperAdminOrOwner = isOwner || isSuperAdmin;
  const hasAdminCommunities = userAdminCommunities.length > 0;
  const hasAccess = isSuperAdminOrOwner || hasAdminCommunities;

  const fetchCommunitiesData = useCallback(async (): Promise<CommunitiesData> => {
    const result = await getCommunities({ limit: 1000 });
    result.sort((a, b) => (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid));

    const userAdminCommunityUidSet = new Set(
      userAdminCommunities.map((community) => community.uid)
    );
    const communityUids: string[] = [];
    for (const community of result) {
      if (isSuperAdminOrOwner || userAdminCommunityUidSet.has(community.uid)) {
        communityUids.push(community.uid);
      }
    }

    if (communityUids.length === 0) {
      setAllCommunities([]);
      setCommunityAdmins([]);
      return { communities: [], admins: [] };
    }

    const communityAdmins = await getCommunityAdminsBatch(communityUids);

    setAllCommunities(result || []);
    setCommunityAdmins(communityAdmins || []);
    return { communities: result, admins: communityAdmins };
  }, [isSuperAdminOrOwner, userAdminCommunities]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["communities", "admins"],
    queryFn: fetchCommunitiesData,
    enabled: hasAccess && authenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Hydrate local state from query cache as well as fresh network responses.
  // This fixes the back-navigation case where cached data exists but queryFn doesn't rerun.
  useEffect(() => {
    if (!data) return;
    setAllCommunities(data.communities || []);
    setCommunityAdmins(data.admins || []);
  }, [data]);

  // Collect all unique admin addresses for profile lookup
  const allAdminAddresses = useMemo(() => {
    const addresses = new Set<string>();
    communityAdmins.forEach((ca) => {
      ca.admins.forEach((admin) => {
        addresses.add(admin.user.id.toLowerCase());
      });
    });
    return Array.from(addresses);
  }, [communityAdmins]);

  const { data: adminProfiles } = useQuery({
    queryKey: ["adminProfiles", allAdminAddresses],
    queryFn: () => communityAdminsService.getUserProfiles(allAdminAddresses),
    enabled: allAdminAddresses.length > 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Filter communities based on user role
  const baseCommunities = useMemo(() => {
    if (isSuperAdminOrOwner) {
      return allCommunities;
    } else if (hasAdminCommunities) {
      const userAdminUids = new Set(userAdminCommunities.map((community) => community.uid));
      return allCommunities.filter((community) => userAdminUids.has(community.uid));
    }
    return [];
  }, [allCommunities, isSuperAdminOrOwner, hasAdminCommunities, userAdminCommunities]);

  const communityAdminsById = useMemo(
    () =>
      new Map(
        communityAdmins.map((communityAdmin) => [
          communityAdmin.id,
          {
            ...communityAdmin,
            admins: communityAdmin.status === "ok" ? communityAdmin.admins : [],
          },
        ])
      ),
    [communityAdmins]
  );

  const userAdminCommunitiesSet = useMemo(
    () => new Set(userAdminCommunities.map((community) => community.uid)),
    [userAdminCommunities]
  );

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

    // Filter by search query (community name only) - uses debounced value
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const name = c.details?.name?.toLowerCase() || "";
        return name.includes(query);
      });
    }

    return filtered;
  }, [baseCommunities, debouncedSearchQuery, selectedNetwork]);

  const toggleAdminExpansion = useCallback((communityUid: string) => {
    setExpandedAdmins((prev) => {
      const next = new Set(prev);
      if (!next.delete(communityUid)) {
        next.add(communityUid);
      }
      return next;
    });
  }, []);

  // Clean up expanded state when displayed communities change to prevent memory leak
  useEffect(() => {
    const displayedUids = new Set(displayedCommunities.map((c) => c.uid as string));
    setExpandedAdmins((prev) => {
      const filtered = new Set([...prev].filter((uid) => displayedUids.has(uid)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [displayedCommunities]);

  // Fold `authenticated` and `isOwnerLoading` into the loading computation so
  // disabled queries can never strand anyone in a skeleton, and so an
  // authenticated user whose owner check is still resolving sees a skeleton
  // (not the NOT_ADMIN branch). The unauthenticated case is handled by an
  // explicit AccessDenied branch below — once Privy is `ready`, guests never
  // fall through to a blank/NOT_ADMIN area.
  const isLoadingData =
    authenticated &&
    (isLoading ||
      isPermissionsLoading ||
      isOwnerLoading ||
      (!isSuperAdminOrOwner && isLoadingUserCommunities));

  const handleRefetch = useCallback(async () => {
    try {
      const result = await refetch();
      if (result.data) {
        setAllCommunities(result.data.communities);
        setCommunityAdmins(result.data.admins);
      }
    } catch (error) {
      errorManager(`Error refetching communities`, error);
    }
    return undefined;
  }, [refetch]);

  function _shortenHex(hexString: string) {
    const firstPart = hexString.substring(0, 6);
    const lastPart = hexString.substring(hexString.length - 6);

    return `${firstPart}...${lastPart}`;
  }

  // Privy still booting — show a skeleton, never a denial flash.
  if (!ready) {
    return (
      <div className={layoutTheme.padding}>
        <PageSkeleton />
      </div>
    );
  }

  // Explicit guest branch: signed-out visitors get a sign-in CTA instead of
  // falling through disabled queries to a blank/NOT_ADMIN area (#1213).
  if (!authenticated) {
    return (
      <AccessDenied
        title="Admin access required"
        {...communityAdminDenial()}
        cta={{ label: "Go to Home", href: PAGES.HOME }}
      />
    );
  }

  return (
    <div className={layoutTheme.padding}>
      {isLoadingData ? (
        <PageSkeleton />
      ) : hasAccess ? (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <h1 className="text-2xl font-bold">
              {isSuperAdminOrOwner ? "All Communities" : "Your Communities"}{" "}
              <span className="text-gray-500 dark:text-gray-400">
                ({displayedCommunities.length}
                {baseCommunities.length !== displayedCommunities.length &&
                  ` of ${baseCommunities.length}`}
                )
              </span>
            </h1>
            <div className="flex items-center gap-3">
              {isSuperAdmin ? (
                <Button asChild variant="outline">
                  <Link href={PAGES.DONOR_RESEARCH.ADMIN}>
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                    Nonprofit research
                  </Link>
                </Button>
              ) : null}
              <CommunityDialog refreshCommunities={handleRefetch} />
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search by community name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9  shadow"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Network Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Network</span>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="w-[180px] shadow" aria-label="Select network">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  {availableNetworks.map(([chainId, name]) => (
                    <SelectItem key={chainId} value={String(chainId)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-5 w-full">
            {displayedCommunities.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayedCommunities.map((community) => {
                  const isAdminOfThisCommunity = userAdminCommunitiesSet.has(community.uid);
                  return (
                    <CommunityAdminCard
                      key={community.uid}
                      community={community}
                      matchingCommunityAdmin={communityAdminsById.get(community.uid)}
                      canManageAdmins={isSuperAdminOrOwner || isAdminOfThisCommunity}
                      canManageConfig={isSuperAdminOrOwner}
                      isExpanded={expandedAdmins.has(community.uid)}
                      onToggleExpansion={toggleAdminExpansion}
                      adminProfiles={adminProfiles}
                      onRefetch={handleRefetch}
                    />
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
                    {isSuperAdminOrOwner ? "No communities found" : MESSAGES.ADMIN.NO_COMMUNITIES}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2 text-black dark:text-white">
            Admin access required
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
        </div>
      )}
    </div>
  );
}
