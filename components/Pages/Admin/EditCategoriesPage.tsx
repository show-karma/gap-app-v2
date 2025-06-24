"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCategories } from "@/hooks/useCategories";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { useGrants } from "@/hooks/useGrants";
import { useGrantsTable } from "@/hooks/useGrantsTable";
import { useAuthStore } from "@/store/auth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { CategoryCreationDialog } from "./CategoryCreationDialog";
import { GrantsTable } from "./GrantsTable";
import { ProgramFilter } from "./ProgramFilter";

export const metadata = defaultMetadata;

export interface CategoriesOptions {
  id: number;
  name: string;
}

export default function EditCategoriesPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const params = useParams();
  const communityId = params.communityId as string;
  const [selectedCategories, setSelectedCategories] = useState<
    Record<string, string[]>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const signer = useSigner();

  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  // Check if user is admin of this community
  const { isCommunityAdmin: isAdmin, isLoading: loading } = useIsCommunityAdmin(community, address);

  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError]);

  // Fetch grants data
  const {
    data: grants = [],
    isLoading: isLoadingGrants,
    refetch: refreshGrants,
  } = useGrants(communityId);

  // Table state management
  const {
    currentPage,
    totalItems,
    paginatedGrants,
    uniquePrograms,
    selectedProgramId,
    sort,
    handlePageChange,
    handleProgramChange,
    handleSortChange,
  } = useGrantsTable({
    grants,
    itemsPerPage: 12,
  });



  const { data: categoriesOptions = [], refetch: refreshCategories } =
    useCategories(communityId);

  const handleCategoryChange = (uid: string, newCategories: string[]) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [uid]: newCategories,
    }));
  };

  const saveEdits = async () => {
    setIsSaving(true);
    try {
      let hasError = false;
      const promises = Object.entries(selectedCategories).map(
        ([uid, categories]) => {
          return fetchData(INDEXER.PROJECT.CATEGORIES.UPDATE(uid), "PUT", {
            categories,
            communityUID: community?.uid,
          })
            .then(() => {
              refreshGrants();
            })
            .catch((error) => {
              console.error(error);
              hasError = true;
            });
        }
      );
      await Promise.all(promises);

      if (hasError) {
        throw new Error("Error updating categories");
      }

      toast.success("Categories updated successfully.");
    } catch (error: any) {
      errorManager(
        `Error updating categories of ${communityId}`,
        error,
        {
          communityId,
          address,
          selectedCategories,
        },
        { error: MESSAGES.CATEGORY.UPDATE.ERROR }
      );
      console.log(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoadingGrants) {
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
              Return to admin page
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <ProgramFilter
              programs={uniquePrograms}
              selectedProgramId={selectedProgramId}
              onChange={handleProgramChange}
            />
            <CategoryCreationDialog
              refreshCategories={async () => {
                refreshCategories();
              }}
            />
          </div>
        </div>
        <GrantsTable
          grants={paginatedGrants}
          categories={categoriesOptions}
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={12}
          onPageChange={handlePageChange}
          isSaving={isSaving}
          onSave={saveEdits}
          sort={sort}
          onSort={handleSortChange}
        />
      </div>
    </div>
  );
}
