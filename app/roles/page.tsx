"use client";

import React from "react";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import {
  UserGroupIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

/**
 * Generic roles dashboard page
 * Shows all roles and resources the current user has access to
 */
export default function RolesDashboard() {
  const router = useRouter();
  const { programs, isLoading, hasPrograms } = useReviewerPrograms();

  const handleNavigateToProgram = (programId: string, chainID: number) => {
    // Navigate to the program's applications page where reviewer can view/comment
    router.push(`/funding-platform/${programId}/${chainID}/applications`);
  };

  const handleNavigateToRole = (role: string) => {
    router.push(`/roles/${role}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          My Roles & Permissions
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and manage your roles across different programs and communities
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Reviewer Role Card */}
        {hasPrograms && (
          <div
            onClick={() => handleNavigateToRole("reviewer")}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
              "hover:shadow-md transition-shadow cursor-pointer p-6"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Program Reviewer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Review and comment on funding applications
            </p>
            <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
              <span className="font-medium">{programs.length}</span>
              <span className="ml-1">
                {programs.length === 1 ? "program" : "programs"}
              </span>
            </div>
          </div>
        )}

        {/* Admin Role Card (placeholder) */}
        <div
          className={cn(
            "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
            "opacity-50 cursor-not-allowed p-6"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BriefcaseIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Community Admin
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage communities and programs
          </p>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
            <span>Check community pages</span>
          </div>
        </div>
      </div>

      {/* Programs Section for Reviewers */}
      {hasPrograms && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Programs You Review
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
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {program.name || `Program ${program.programId.slice(0, 8)}...`}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Chain ID: {program.chainID} • Assigned:{" "}
                            {new Date(program.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {program.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleNavigateToProgram(program.programId, program.chainID)}
                      variant="secondary"
                      className="ml-4"
                    >
                      View Applications
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasPrograms && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            No Active Roles
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You don&apos;t have any special roles or permissions yet.
          </p>
        </div>
      )}
    </div>
  );
}