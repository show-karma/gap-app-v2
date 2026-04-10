"use client";

import { useParams } from "next/navigation";
import { FoundationDetail } from "@/src/features/grant-atlas/components/foundation-detail";

export default function FoundationPage() {
  const params = useParams<{ id: string }>();
  return (
    <main className="w-full">
      <FoundationDetail id={params.id} />
    </main>
  );
}
