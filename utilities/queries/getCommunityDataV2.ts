import { cache } from "react";
import { notFound } from "next/navigation";
import { CommunityDetailsV2, CommunityStatsV2, CommunityProjectsV2Response } from "@/types/community";
import { SortByOptions, StatusOptions } from "@/types/filters";
import fetchData from "@/utilities/fetchData";
import { zeroUID } from "@/utilities/commons";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityDetailsV2 = cache(
  async (slug: string): Promise<CommunityDetailsV2> => {
    try {
      const [data] = await fetchData(
        INDEXER.COMMUNITY.V2.GET(slug)
      );

      if (!data || data?.uid === zeroUID || !data?.details?.name) {
        notFound();
      }
      
      return data as CommunityDetailsV2;
    } catch (error) {
      console.log("Not found community", slug, error);
      notFound();
    }
  }
);

export const getCommunityStatsV2 = cache(
  async (slug: string): Promise<CommunityStatsV2> => {
    try {
      const [data] = await fetchData(
        INDEXER.COMMUNITY.V2.STATS(slug)
      );
      
      if (data) {
        return data as CommunityStatsV2;
      }
      
      return {
        totalProjects: 0,
        totalGrants: 0,
        totalMilestones: 0,
        projectUpdates: 0,
        projectUpdatesBreakdown: {
          projectMilestones: 0,
          projectCompletedMilestones: 0,
          projectUpdates: 0,
          grantMilestones: 0,
          grantCompletedMilestones: 0,
          grantUpdates: 0,
        },
        totalTransactions: 0,
        averageCompletion: 0,
      };
    } catch (error) {
      console.log("Error fetching community stats", slug, error);
      return {
        totalProjects: 0,
        totalGrants: 0,
        totalMilestones: 0,
        projectUpdates: 0,
        projectUpdatesBreakdown: {
          projectMilestones: 0,
          projectCompletedMilestones: 0,
          projectUpdates: 0,
          grantMilestones: 0,
          grantCompletedMilestones: 0,
          grantUpdates: 0,
        },
        totalTransactions: 0,
        averageCompletion: 0,
      };
    }
  }
);

export const getCommunityProjectsV2 = async (
  slug: string,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    categories?: string;
    status?: string;
    selectedProgramId?: string;
    selectedTrackIds?: string[];
  } = {}
): Promise<CommunityProjectsV2Response> => {
  try {
    const [data] = await fetchData(
      INDEXER.COMMUNITY.V2.PROJECTS(slug, options)
    );
    
    if (data) {
      return data as CommunityProjectsV2Response;
    }
    
    return {
      payload: [],
      pagination: {
        totalCount: 0,
        page: options.page || 1,
        limit: options.limit || 12,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error) {
    console.log("Error fetching community projects", slug, error);
    return {
      payload: [],
      pagination: {
        totalCount: 0,
        page: options.page || 1,
        limit: options.limit || 12,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
}; 