import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions.improved";

interface RoleBasedLayoutProps {
  children: ReactNode;
  params: {
    communityId: string;
    role: "admin" | "reviewer";
  };
}

/**
 * Unified layout for role-based funding platform access
 * Consolidates admin and reviewer routes into a single dynamic structure
 */
export default async function RoleBasedLayout({
  children,
  params,
}: RoleBasedLayoutProps) {
  const { communityId, role } = params;

  // Validate role parameter
  if (role !== "admin" && role !== "reviewer") {
    redirect(`/community/${communityId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RolePermissionGuard role={role} communityId={communityId}>
        {children}
      </RolePermissionGuard>
    </div>
  );
}

/**
 * Client component to check permissions
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";

interface RolePermissionGuardProps {
  role: "admin" | "reviewer";
  communityId: string;
  children: ReactNode;
}

function RolePermissionGuard({
  role,
  communityId,
  children,
}: RolePermissionGuardProps) {
  const router = useRouter();
  const { hasRole, isLoading, error, isAuthenticated } = usePermissions({
    role,
    // We'll need to get programId/chainID from context or props
    enabled: true,
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push("/");
      return;
    }

    // Redirect if doesn't have required role
    if (!isLoading && isAuthenticated && !hasRole) {
      // If trying to access admin but only has reviewer role, redirect to reviewer
      if (role === "admin") {
        const reviewerPath = window.location.pathname.replace("/admin/", "/reviewer/");
        router.push(reviewerPath);
      } else {
        // If trying to access reviewer but doesn't have role, go to community page
        router.push(`/community/${communityId}`);
      }
    }
  }, [isLoading, isAuthenticated, hasRole, role, communityId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
        <span className="sr-only">Checking permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Permission Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message}
          </p>
          {error.retryable && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this {role} area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}