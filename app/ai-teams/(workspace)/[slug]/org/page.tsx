"use client";

import { useParams } from "next/navigation";
import { TabContent, Tabs, TabTrigger } from "@/components/Utilities/Tabs";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { BrandForm } from "@/src/features/org-brain/BrandForm";
import { MissionForm } from "@/src/features/org-brain/MissionForm";

export default function OrgBrainPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <main className="w-full">
      <NonprofitPageHeader
        eyebrow="Context"
        title="Org Brain"
        description="The shared context your team uses in every conversation. Saved here, referenced everywhere."
      />

      <Tabs defaultTab="mission">
        <div className="mt-8 flex gap-1 border-b border-gray-200 dark:border-zinc-800">
          <TabTrigger value="mission" className="-mb-px border-b-2 rounded-none px-4 py-2 text-sm">
            Mission
          </TabTrigger>
          <TabTrigger value="brand" className="-mb-px border-b-2 rounded-none px-4 py-2 text-sm">
            Brand
          </TabTrigger>
        </div>

        <div className="mt-8">
          <TabContent value="mission">
            <MissionForm slug={slug} />
          </TabContent>
          <TabContent value="brand">
            <BrandForm slug={slug} />
          </TabContent>
        </div>
      </Tabs>
    </main>
  );
}
