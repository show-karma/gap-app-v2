"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";

interface NewGrantLayoutProps {
  children: React.ReactNode;
}

/**
 * New Grant Layout for V2 Profile
 *
 * This layout provides:
 * - Back button to return to funding list
 * - Page title
 * - Form content area
 *
 * Used within the (profile) route group to maintain the main project profile layout
 * while showing the new grant form.
 */
export default function NewGrantLayout({ children }: NewGrantLayoutProps) {
  const params = useParams();
  const projectId = params.projectId as string;
  const fundingPath = `/project/${projectId}/funding`;

  return (
    <div className="flex flex-col gap-4" data-testid="new-grant-layout">
      {/* Back Button */}
      <Link
        href={fundingPath}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-fit"
        data-testid="back-to-funding"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Funding
      </Link>

      {/* Page Title */}
      <h2 className="text-xl font-semibold text-black dark:text-zinc-100 border-b border-gray-200 dark:border-zinc-700 pb-4">
        Add New Funding
      </h2>

      {/* Form Content */}
      <div className="flex flex-col" data-testid="new-grant-content">
        {children}
      </div>
    </div>
  );
}
