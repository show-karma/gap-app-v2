"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TEAM_ROLES, type TeamRole } from "@/lib/hermes-client";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { SkillsMarketplace } from "@/src/features/skills/SkillsMarketplace";
import { PAGES } from "@/utilities/pages";

export default function SkillsMarketplacePage() {
  const params = useSearchParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<TeamRole>("orchestrator");

  useEffect(() => {
    setSlug(params.get("slug") ?? undefined);
    const candidate = params.get("role");
    if (candidate && (TEAM_ROLES as readonly string[]).includes(candidate)) {
      setRole(candidate as TeamRole);
    }
  }, [params]);

  if (!slug) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Skills marketplace</h1>
        <p className="mt-4 text-gray-700">
          Set up your team first to install skills for an employee.
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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NonprofitPageHeader
        eyebrow="Marketplace"
        title="Skills marketplace"
        description="Browse skills bundled in this Hermes instance. Pick an employee, then install — they'll use it on the next chat turn."
      />
      <SkillsMarketplace slug={slug} role={role} onRoleChange={setRole} />
    </main>
  );
}
