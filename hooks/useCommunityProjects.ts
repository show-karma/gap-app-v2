"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface CommunityProject {
  uid: string;
  title: string;
  slug: string;
}

export function useCommunityProjects(programId?: string | null) {
  const { communityId } = useParams();

  const queryKey = ["community-projects", communityId, programId || "all"];

  const queryFn = async (): Promise<CommunityProject[]> => {
    if (!communityId) return [];

    const queryParams: { limit: number; selectedProgramId?: string } = { limit: 1000 };
    if (programId) {
      queryParams.selectedProgramId = programId; // This maps to 'programIds' in the URL
    }

    const [data, error] = await fetchData<{
      payload?: Array<{
        uid: string;
        title?: string;
        slug?: string;
        details?: { title?: string; slug?: string };
      }>;
    }>(INDEXER.COMMUNITY.V2.PROJECTS(communityId as string, queryParams));

    if (error) {
      throw error;
    }

    // Transform the API response to extract project information
    // The API returns projects in the 'payload' array directly
    const projects = data?.payload || [];
    return projects.map((project) => ({
      uid: project.uid,
      title: project.details?.title || project.title || "Untitled Project",
      slug: project.details?.slug || project.slug || "",
    }));
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId,
  });
}
