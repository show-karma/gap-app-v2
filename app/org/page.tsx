"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandForm } from "@/src/features/org-brain/BrandForm";
import { MissionForm } from "@/src/features/org-brain/MissionForm";
import { PAGES } from "@/utilities/pages";

type Tab = "mission" | "brand";

export default function OrgBrainPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("mission");

  useEffect(() => {
    setSlug(params.get("slug") ?? undefined);
    const initial = params.get("tab");
    if (initial === "brand" || initial === "mission") setTab(initial);
  }, [params]);

  if (!slug) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Org Brain</h1>
        <p className="mt-4 text-gray-700">
          Set up your team first to start filling in your org context.
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Org Brain</h1>
        <p className="mt-2 text-sm text-gray-600">
          The shared context your team uses in every conversation. Saved here,
          referenced everywhere.
        </p>
      </header>

      <nav className="mt-8 flex gap-1 border-b" role="tablist">
        <TabButton active={tab === "mission"} onClick={() => setTab("mission")}>
          Mission
        </TabButton>
        <TabButton active={tab === "brand"} onClick={() => setTab("brand")}>
          Brand
        </TabButton>
      </nav>

      <section className="mt-8">
        {tab === "mission" ? <MissionForm slug={slug} /> : <BrandForm slug={slug} />}
      </section>
    </main>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium ${
        active
          ? "border-b-2 border-black text-black"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
