"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { BrandForm } from "@/src/features/org-brain/BrandForm";
import { MissionForm } from "@/src/features/org-brain/MissionForm";

type Tab = "mission" | "brand";

// Module-level to avoid re-creating array each render.
const ORG_TABS = [
  { id: "mission" as Tab, label: "Mission" },
  { id: "brand" as Tab, label: "Brand" },
] as const;

export default function OrgBrainPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>("mission");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NonprofitPageHeader
        eyebrow="Context"
        title="Org Brain"
        description="The shared context your team uses in every conversation. Saved here, referenced everywhere."
      />

      {/* Tab bar — full ARIA per P2-2 */}
      <div className="mt-8 flex gap-1 border-b border-gray-200" role="tablist">
        {ORG_TABS.map((t) => (
          <TabButton key={t.id} id={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {/* Tab panels — each gets role="tabpanel", id, aria-labelledby per P2-2 */}
      {ORG_TABS.map((t) => (
        <section
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={tab !== t.id}
          className="mt-8"
        >
          {t.id === "mission" && tab === "mission" ? (
            <MissionForm slug={slug} />
          ) : t.id === "brand" && tab === "brand" ? (
            <BrandForm slug={slug} />
          ) : null}
        </section>
      ))}
    </main>
  );
}

function TabButton({
  id,
  active,
  children,
  onClick,
}: {
  id: Tab;
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
        active
          ? "border-gray-900 font-semibold text-gray-900"
          : "border-transparent text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}
