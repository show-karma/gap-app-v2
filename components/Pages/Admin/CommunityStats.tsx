"use client";
import { useEffect, useState } from "react";
import { Community } from "@show-karma/karma-gap-sdk";
import { useGap } from "@/hooks/useGap";
import { useOwnerStore } from "@/store/owner";
import { Spinner } from "@/components/Utilities/Spinner";
import { MESSAGES } from "@/utilities/messages";
import React from "react";
import { blo } from "blo";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface CommunityStatsData {
  projects: number;
  projectEdits: number;
  endorsements: number;
  impacts: number;
  impactVerifications: number;
  grants: number;
  grantEdits: number;
  grantUpdates: number;
  grantUpdateStatusPosts: number;
  grantsCompleted: number;
  milestones: number;
  milestonesCompleted: number;
  milestonesVerifications: number;
  membersAdded: number;
  totalAttestations: number;
}

export default function CommunityStats() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [communityStats, setCommunityStats] = useState<
    Record<string, CommunityStatsData>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { gap } = useGap();

  const fetchCommunities = async () => {
    try {
      if (!gap) throw new Error("Gap not initialized");
      setIsLoading(true);
      const result = await gap.fetch.communities();
      result.sort((a, b) =>
        (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
      );
      setAllCommunities(result);
      return result;
    } catch (error) {
      console.log(error);
      setAllCommunities([]);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommunityStats = async (communities: Community[]) => {
    try {
      const statsPromises = communities.map(async (community) => {
        const [data, error]: any = await fetchData(
          INDEXER.COMMUNITY.STATS(community.uid as string)
        );
        if (error) {
          console.error(`Failed to fetch stats for ${community.uid}`, error);
          return { uid: community.uid, stats: {} };
        }
        return { uid: community.uid, stats: data };
      });

      const statsResults = await Promise.all(statsPromises);

      const statsMap: Record<string, CommunityStatsData> = {};
      statsResults.forEach(({ uid, stats }) => {
        statsMap[uid] = {
          projects: stats?.projects || 0,
          projectEdits: stats?.ProjectEdits || 0,
          endorsements: stats?.ProjectEndorsements || 0,
          impacts: stats?.ProjectImpacts || 0,
          impactVerifications: stats?.ProjectImpactVerifieds || 0,
          grants: stats?.grants || 0,
          grantEdits: stats?.GrantEdits || 0,
          grantUpdates: stats?.GrantUpdates || 0,
          grantUpdateStatusPosts: stats?.GrantUpdateStatuses || 0,
          grantsCompleted: stats?.GrantCompleted || 0,
          milestones: stats?.Milestones || 0,
          milestonesCompleted: stats?.MilestoneCompleted || 0,
          milestonesVerifications: stats?.MilestoneVerified || 0,
          membersAdded: stats?.MemberOf || 0,
          totalAttestations:
            (stats?.projects || 0) +
              (stats?.grants || 0) +
              (stats?.GrantUpdates || 0) +
              (stats?.GrantCompleted || 0) +
              (stats?.ProjectImpacts || 0) +
              (stats?.MemberOf || 0) +
              (stats?.ProjectEndorsements || 0) +
              (stats?.Milestones || 0) +
              (stats?.MilestoneCompleted || 0) +
              (stats?.MilestoneVerified || 0) +
              (stats?.ProjectImpactVerifieds || 0) +
              (stats?.GrantUpdateStatuses || 0) +
              (stats?.GrantEdits || 0) +
              (stats?.ProjectEdits || 0) || 0,
        };
      });
      setCommunityStats(statsMap);
    } catch (error) {
      console.log("Failed to fetch community stats", error);
    }
  };

  useEffect(() => {
    fetchCommunities().then((communities) => {
      if (communities) {
        fetchCommunityStats(communities);
      }
    });
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {isOwner ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-2xl font-bold">
              All Communities{" "}
              {allCommunities.length ? `(${allCommunities.length})` : ""}
            </div>
          </div>
          <div className="mt-5 w-full gap-5">
            {isLoading ? (
              <Spinner />
            ) : (
              <div className="overflow-x-auto">
                <table className="border-x border-x-zinc-300 border-y border-y-zinc-300 table-auto w-full">
                  <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                    <tr className="divide-x">
                      <th className="whitespace-normal px-2 py-2 text-left">
                        Img
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-left">
                        Name
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Projects
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Project Edits
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Endorsements
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Impacts
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Impact Verifications
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Grants
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Grant Edits
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Grant Updates
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Grant Update Status Posts
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Grants Completed
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Milestones
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Milestones Completed
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Milestones Verifications
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Members Added
                      </th>
                      <th className="whitespace-normal px-2 py-2 text-center">
                        Total Attestations
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-x">
                    {allCommunities.map((community) => {
                      const stats = communityStats[community.uid] || {};
                      return (
                        <React.Fragment key={community.uid}>
                          <tr className="divide-x">
                            <td className="px-2 py-2">
                              <img
                                src={
                                  community.details?.imageURL ||
                                  blo(community.uid)
                                }
                                className="h-[64px] w-[100px] object-cover"
                                alt={community.details?.name || community.uid}
                              />
                            </td>
                            <td className="max-w-40 px-2 py-2">
                              {community.details?.name}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.projects || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.projectEdits || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.endorsements || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.impacts || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.impactVerifications || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.grants || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.grantEdits || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.grantUpdates || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.grantUpdateStatusPosts || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.grantsCompleted || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.milestones || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.milestonesCompleted || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.milestonesVerifications || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.membersAdded || 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {stats.totalAttestations || 0}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p>{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      )}
    </div>
  );
}
