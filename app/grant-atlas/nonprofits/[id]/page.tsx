"use client";

import { useParams } from "next/navigation";
import { NonprofitDetail } from "@/src/features/grant-atlas/components/nonprofit-detail";

export default function NonprofitPage() {
  const params = useParams<{ id: string }>();
  return (
    <main className="w-full">
      <NonprofitDetail id={params.id} />
    </main>
  );
}
