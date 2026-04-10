"use client";

import { useParams } from "next/navigation";
import { GrantDetail } from "@/src/features/grant-atlas/components/grant-detail";

export default function GrantPage() {
  const params = useParams<{ id: string }>();
  return (
    <main className="w-full">
      <GrantDetail id={params.id} />
    </main>
  );
}
