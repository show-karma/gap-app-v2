"use client";

import { useParams } from "next/navigation";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { WorkBoard } from "@/src/features/work-board/WorkBoard";

export default function WorkPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <NonprofitPageHeader
        eyebrow="Work board"
        title="Work board"
        description="Everything your team is doing. Drop new tasks here, watch them move across columns, leave a comment to nudge."
      />

      <div className="mt-8">
        <WorkBoard slug={slug} />
      </div>
    </main>
  );
}
