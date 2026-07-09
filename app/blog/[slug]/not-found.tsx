"use client";

import { FileX } from "lucide-react";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";

export default function BlogPostNotFound() {
  return (
    <main className="container mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 p-8 text-center dark:border-zinc-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
          <FileX className="h-6 w-6 text-gray-500 dark:text-gray-400" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Post not found</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We couldn&apos;t find a post at this URL. It may have been unpublished or the link is
          incorrect.
        </p>
        <Link
          href={PAGES.BLOG}
          className="mt-2 flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          ← Back to blog
        </Link>
      </div>
    </main>
  );
}
