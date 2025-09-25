"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { useCommunityProjectsV2 } from "@/hooks/useCommunityProjectsV2";
import { useCommunityGrants } from "@/hooks/useCommunityGrants";
import { ProjectV2 } from "@/types/community";
import { useAuth } from "@/hooks/useAuth";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { RegionCreationDialog } from "./RegionCreationDialog";
import { ProgramFilter } from "./ProgramFilter";
import { useCommunityRegions } from "@/hooks/useCommunityRegions";
import { MESSAGES } from "@/utilities/messages";
import TablePagination from "@/components/Utilities/TablePagination";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
export const metadata = defaultMetadata;

interface ProjectsTableProps {
  projects: ProjectV2[];
  regions: any[];
  selectedRegions: Record<string, string>;
  optimisticRegions: Record<string, string>;
  onRegionChange: (uid: string, region: string) => void;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isSaving: boolean;
}

const ProjectsTable: React.FC<ProjectsTableProps> = ({
  projects,
  regions,
  selectedRegions,
  optimisticRegions,
  onRegionChange,
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  isSaving,
}) => {
  return (
    <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
      <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
        <thead>
          <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Project
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Grant Program
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Description
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Current Region
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Assign Region
            </th>
          </tr>
        </thead>
        <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
          {projects.map((project) => {
            // Check for optimistic update first
            const optimisticRegion = optimisticRegions[project.uid];

            // Get the current region from the project's regions array
            const projectRegions = project.regions || [];
            const currentRegionName = projectRegions.length > 0 ? projectRegions[0] : "";

            // Find the region ID from the name
            const currentRegionId = currentRegionName
              ? regions.find(r => r.name === currentRegionName)?.id || ""
              : "";

            // Use optimistic update if available, otherwise use current region
            const displayRegionId = optimisticRegion !== undefined ? optimisticRegion : currentRegionId;

            // Get the display name for current region (considering optimistic updates)
            const displayRegionName = optimisticRegion !== undefined
              ? (regions.find(r => r.id === optimisticRegion)?.name || "None")
              : (currentRegionName || "None");

            return (
              <tr key={project.uid} className="dark:text-zinc-300 text-gray-900 px-4 py-4">
                <td className="px-4 py-2 font-medium h-16">
                  <Link
                    href={PAGES.PROJECT.OVERVIEW(project.details.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-full line-clamp-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {project.details.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <div className="max-w-full line-clamp-2">
                    {project.grantNames.join(", ") || "No grants"}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="max-w-[200px] line-clamp-2">
                    {project.details.description}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {/* Display the current region with optimistic updates */}
                  <span className="text-sm">
                    {displayRegionName}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <SearchWithValueDropdown
                    list={[
                      { value: "", title: "None" },
                      ...regions.map((region) => ({
                        value: region.id,
                        title: region.name,
                      }))
                    ]}
                    onSelectFunction={(value) => {
                      onRegionChange(project.uid, value);
                    }}
                    selected={displayRegionId ? [displayRegionId] : []}
                    type="Region"
                    id={`region-${project.uid}`}
                    disabled={isSaving}
                    isMultiple={false}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
        <div className="w-full">
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={onPageChange}
            postsPerPage={itemsPerPage}
            totalPosts={totalItems}
          />
        </div>
      </div>
    </div>
  );
};

export default function EditProjectsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const params = useParams();
  const communityId = params.communityId as string;
  const [selectedRegions, setSelectedRegions] = useState<
    Record<string, string>
  >({});
  const [optimisticRegions, setOptimisticRegions] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  // Check if user is admin of this community
  const { isCommunityAdmin: isAdmin, isLoading: loading } = useIsCommunityAdmin(
    community?.uid,
    address
  );

  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError]);

  // Simple state management for pagination since we're using the v2 endpoint
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Fetch projects data using the V2 endpoint with server-side filtering
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refreshProjects,
  } = useCommunityProjectsV2(community?.details?.data?.slug || communityId, {
    page: currentPage,
    limit: 12,
    selectedProgramId: selectedProgramId || undefined,
  });

  // Fetch all grants for the filter dropdown
  const { data: grants = [] } = useCommunityGrants(
    community?.details?.data?.slug || communityId
  );


  const projects = projectsData?.payload || [];
  const totalItems = projectsData?.pagination?.totalCount || 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleProgramChange = (programId: string | null) => {
    setSelectedProgramId(programId || "");
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const { data: regionsOptions = [], refetch: refreshRegions } =
    useCommunityRegions(community?.uid || "");

  const handleRegionChange = async (uid: string, newRegion: string) => {
    // Store the previous region for rollback if needed
    const previousRegion = optimisticRegions[uid] ||
      projects?.find(p => p.uid === uid)?.regions?.[0] || "";

    // Optimistic update - immediately update the UI
    setOptimisticRegions((prev) => ({
      ...prev,
      [uid]: newRegion,
    }));

    // Auto-save when region is selected
    setIsSaving(true);
    try {
      await fetchData(INDEXER.PROJECT.REGIONS.UPDATE(uid), "PUT", {
        regions: newRegion ? [newRegion] : [],
        communityUID: community?.uid,
      });
      toast.success("Region updated successfully.");

      // Update the actual data in the background
      await refreshProjects();

      // Clear the optimistic update since the real data is now updated
      setOptimisticRegions((prev) => {
        const newState = { ...prev };
        delete newState[uid];
        return newState;
      });
    } catch (error: any) {
      errorManager(
        `Error updating region for project ${uid}`,
        error,
        {
          projectUid: uid,
          communityId,
          address,
          newRegion,
        },
        { error: "Failed to update region. Please try again." }
      );

      // Revert to previous region on error
      setOptimisticRegions((prev) => ({
        ...prev,
        [uid]: previousRegion,
      }));

      // Clear the optimistic update after a short delay
      setTimeout(() => {
        setOptimisticRegions((prev) => {
          const newState = { ...prev };
          delete newState[uid];
          return newState;
        });
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save implemented in handleRegionChange, no need for separate save function

  if (loading || isLoadingProjects) {
    return (
      <div className="flex w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full items-center justify-center">
        <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      <div className="w-full flex flex-col gap-8">
        <div className="w-full flex flex-row items-center justify-between">
          <Link
            href={PAGES.ADMIN.ROOT(
              community?.details?.data?.slug || (community?.uid as string)
            )}
          >
            <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
              <ChevronLeftIcon className="h-5 w-5" />
              Back to admin
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {grants.length > 0 ? <ProgramFilter
              programs={grants}
              selectedProgramId={selectedProgramId}
              onChange={handleProgramChange}
            /> : null}
            <RegionCreationDialog
              refreshRegions={async () => {
                refreshRegions();
              }}
            />
          </div>
        </div>
        <ProjectsTable
          projects={projects}
          regions={regionsOptions}
          selectedRegions={selectedRegions}
          optimisticRegions={optimisticRegions}
          onRegionChange={handleRegionChange}
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={12}
          onPageChange={handlePageChange}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
