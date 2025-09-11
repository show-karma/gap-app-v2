"use client";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export interface CommunityProject {
  uid: string;
  title: string;
  slug: string;
}

export function useCommunityProjects() {
  const { communityId } = useParams();

  const queryKey = ["community-projects", communityId];

  const queryFn = async (): Promise<CommunityProject[]> => {
    if (!communityId) return [];
    
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.V2.PROJECTS(communityId as string, { limit: 1000 })
    );
    
    if (error) {
      throw error;
    }

      // Transform the API response to extract project information
      // The API returns projects in the 'payload' array directly
      const projects = data?.payload || [];
      return projects.map((project: any) => ({
        uid: project.uid,
        title: project.details?.title || project.title || "Untitled Project",
        slug: project.slug,
      }));
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId,
  });
}
