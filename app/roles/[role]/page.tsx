"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { ArrowLeftIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

/**
 * Role-specific view page
 * Shows detailed information for a specific role (e.g., /roles/reviewer)
 */
export default function RoleSpecificPage() {
  const params = useParams();
  const router = useRouter();
  const role = params.role as string;

  // For now, we only support reviewer role
  const { programs, isLoading, hasPrograms } = useReviewerPrograms();

  const handleBack = () => {
    router.push("/roles");
  };

  const handleNavigateToProgram = (programId: string, chainID: number) => {
    // Navigate to the program's applications page
    router.push(`/funding-platform/${programId}/${chainID}/applications`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  // Handle unsupported roles
  if (role !== "reviewer") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Roles</span>
          </Button>
        </div>
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Role Not Available
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The role &quot;{role}&quot; is not currently available or supported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={handleBack}
          variant="secondary"
          className="flex items-center space-x-2 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Roles</span>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Program Reviewer Role
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Review and provide feedback on funding applications
        </p>
      </div>

      {/* Statistics */}
      {hasPrograms && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Programs
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {programs.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Permissions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Read
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Comment
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Role Status
            </p>
            <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-400">
              Active
            </p>
          </div>
        </div>
      )}

      {/* Programs List */}
      {hasPrograms ? (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Assigned Programs
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {programs.map((program) => (
                <li
                  key={`${program.programId}_${program.chainID}`}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {program.name || `Program ${program.programId.slice(0, 8)}...`}
                          </h3>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <p>Program ID: {program.programId}</p>
                            <p>Chain ID: {program.chainID}</p>
                            <p>
                              Assigned: {new Date(program.assignedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {program.permissions.map((permission) => (
                              <span
                                key={permission}
                                className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                  permission === "read"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                )}
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6">
                      <Button
                        onClick={() =>
                          handleNavigateToProgram(program.programId, program.chainID)
                        }
                      >
                        View Applications
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            No Programs Assigned
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You are not currently assigned as a reviewer for any programs.
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Contact a community admin to be added as a reviewer.
          </p>
        </div>
      )}

      {/* Information Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          About the Reviewer Role
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>As a program reviewer, you have the following capabilities:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>View all submitted applications for assigned programs</li>
            <li>Add comments and feedback on applications</li>
            <li>Read-only access to program configuration and forms</li>
            <li>Collaborate with other reviewers and admins</li>
          </ul>
          <p className="mt-3">
            Your comments will be visible to admins and applicants with a &quot;Reviewer&quot; badge.
          </p>
        </div>
      </div>
    </div>
  );
}