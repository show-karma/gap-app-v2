"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { TEAM_ROLES, type TeamRole } from "@/lib/hermes-client";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { SkillsMarketplace } from "@/src/features/skills/SkillsMarketplace";

export default function SkillsMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();
  // Role selection is purely UI state — not driven by URL params.
  const [role, setRole] = useState<TeamRole>(TEAM_ROLES[0]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NonprofitPageHeader
        eyebrow="Marketplace"
        title="Skills marketplace"
        description="Browse tools your team can use. Pick an employee, then install — they'll use it on the next chat turn."
      />
      <SkillsMarketplace slug={slug} role={role} onRoleChange={setRole} />
    </main>
  );
}
