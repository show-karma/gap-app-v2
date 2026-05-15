"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkBoard } from "@/src/features/work-board/WorkBoard";
import { PAGES } from "@/utilities/pages";

export default function WorkPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSlug(params.get("slug") ?? undefined);
  }, [params]);

  if (!slug) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Work</h1>
        <p className="mt-4 text-gray-700">
          Set up your team first to see what they&apos;re working on.
        </p>
        <button
          type="button"
          onClick={() => router.push(PAGES.TEAM.ONBOARDING)}
          className="mt-6 rounded bg-black px-4 py-2 text-white"
        >
          Set up my team
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Work</h1>
        <p className="mt-2 text-sm text-gray-600">
          Everything your team is doing — drop new tasks here, watch them move,
          comment to nudge.
        </p>
      </header>

      <WorkBoard slug={slug} />
    </main>
  );
}
