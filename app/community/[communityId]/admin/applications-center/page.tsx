"use client";
import { useParams } from "next/navigation";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import { Spinner } from "@/components/Utilities/Spinner";
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import Link from "next/link";
import { useTenantConfigs, useActivateTenantConfig, useDeactivateTenantConfig } from "@/hooks/useTenantConfigs";
import { ApplicationCenterForm } from "@/components/Pages/ApplicationsCenter/ApplicationCenterForm";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";

export default function ApplicationsCenterPage() {
  const { communityId } = useParams() as { communityId: string };

  const { isCommunityAdmin, isLoading: isLoadingAdmin } =
    useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  const {
    data: existingTenant,
    isLoading,
    error,
    refetch,
  } = useTenantConfigs(communityId, {
    enabled: hasAccess && !isLoadingAdmin,
  });

  const activateTenant = useActivateTenantConfig();
  const deactivateTenant = useDeactivateTenantConfig();

  const handleToggleStatus = async () => {
    if (!existingTenant) return;

    const isActive = existingTenant.status === "active";
    const mutation = isActive ? deactivateTenant : activateTenant;

    // Use slug for activate/deactivate operations
    mutation.mutate(existingTenant.slug, {
      onSuccess: () => {
        toast.success(
          `Application center ${isActive ? "deactivated" : "activated"} successfully`
        );
        refetch();
      },
      onError: (error) => {
        console.error("Error toggling status:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to ${isActive ? "deactivate" : "activate"} application center`
        );
      },
    });
  };

  if (isLoadingAdmin || isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            {error instanceof Error
              ? error.message
              : "Failed to load application center"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:px-3 md:px-4 px-6 py-2 flex flex-col gap-4">
      <Link
        href={PAGES.ADMIN.ROOT(communityId)}
        className="flex items-center border border-black dark:border-white text-black dark:text-white rounded-md py-2 px-4 w-max"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back
      </Link>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {existingTenant
                ? "Application Center Configuration"
                : "Create Application Center"}
            </h1>
            {existingTenant && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${existingTenant.status === "active"
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
              >
                {existingTenant.status === "active" ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-4 h-4" />
                    Inactive
                  </>
                )}
              </span>
            )}
          </div>
          {existingTenant && (
            <Button
              onClick={handleToggleStatus}
              disabled={activateTenant.isPending || deactivateTenant.isPending}
              className={`${existingTenant.status === "active"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
              {activateTenant.isPending || deactivateTenant.isPending
                ? "Updating..."
                : existingTenant.status === "active"
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {existingTenant
            ? "Your community already has a whitelabel application center. You can update its configuration below."
            : "Set up a whitelabel application center for your community. Since each community can have only one application center, this will be your community's branded experience."}
        </p>
      </div>

      {/* Show existing tenant info if available */}
      {existingTenant && (
        <div className={`mb-6 p-4 border rounded-lg ${existingTenant.status === "active"
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
          }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {existingTenant.status === "active" ? (
                <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-semibold mb-1 ${existingTenant.status === "active"
                ? "text-blue-900 dark:text-blue-100"
                : "text-gray-900 dark:text-gray-100"
                }`}>
                Application Center is {existingTenant.status === "active" ? "Active" : "Inactive"}
              </h3>
              <div className={`text-sm space-y-1 ${existingTenant.status === "active"
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300"
                }`}>
                <p>
                  <span className="font-medium">Name:</span> {existingTenant.name}
                </p>
                <p>
                  <span className="font-medium">Slug:</span> {existingTenant.slug}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="capitalize">{existingTenant.status}</span>
                </p>
                {existingTenant.domains?.prodUrl && (
                  <p>
                    <span className="font-medium">Production URL:</span>{" "}
                    <a
                      href={
                        existingTenant.domains.prodUrl.startsWith("http")
                          ? existingTenant.domains.prodUrl
                          : `https://${existingTenant.domains.prodUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline ${existingTenant.status === "active"
                        ? "hover:text-blue-900 dark:hover:text-blue-100"
                        : "hover:text-gray-900 dark:hover:text-gray-100"
                        }`}
                    >
                      {existingTenant.domains.prodUrl}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single form that handles both create and edit */}
      <ApplicationCenterForm
        communityId={communityId}
        tenantId={existingTenant?.id} // Pass MongoDB id for fetching existing tenant
        onSuccess={() => {
          refetch();
        }}
        onCancel={() => {
          // No navigation needed - just stay on the page
        }}
      />
    </div>
  );
}
