"use client";

import { Bell, CircleUser, CopyPlus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/utilities/pages";

export function FundingMapSidebar() {
  const ProjectDialog = useMemo(
    () =>
      dynamic(
        () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
        {
          ssr: false,
          loading: () => (
            <Button variant="outline" size="sm" className="w-fit shadow-sm">
              Create a profile
            </Button>
          ),
        }
      ),
    []
  );

  return (
    <aside className="flex w-full flex-col gap-6 rounded-2xl lg:w-80 lg:shrink-0">
      {/* Newsletter & Submit Program Section */}
      <div className="flex bg-background border border-border flex-col items-start gap-5 rounded-xl p-5">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <p className="font-medium text-foreground">
          Be the first to know when a new program launches
        </p>
        <iframe
          src="https://paragraph.com/@karmahq/embed?minimal=true&vertical=true"
          width="100%"
          height="90"
          title="Subscribe to Karma"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ border: 0, overflow: "hidden" }}
        />
      </div>
      <div className="flex flex-col gap-4">
        <div className="px-5">
          <div className="h-px w-full bg-border" />
        </div>

        <div className="flex flex-col gap-5 rounded-xl p-5">
          <CopyPlus className="h-5 w-5 text-muted-foreground" />
          <p className="font-medium text-foreground">Funding opportunity not listed?</p>
          <Button variant="outline" className="w-fit shadow-sm" asChild>
            <Link href={PAGES.REGISTRY.ADD_PROGRAM} prefetch>
              Submit a program
            </Link>
          </Button>
        </div>

        <div className="px-5">
          <div className="h-px w-full bg-border" />
        </div>
      </div>

      {/* Create Profile Card */}
      <div className="flex flex-col gap-5 rounded-xl p-5">
        <CircleUser className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col gap-3">
          <p className="font-medium text-foreground">Create your project profile</p>
          <p className="text-sm font-medium text-muted-foreground">
            Create a profile to start building onchain reputation, endorsements and community
            donations.
          </p>
        </div>
        <ProjectDialog
          buttonElement={{
            text: "Create a profile",
            styleClass:
              "w-fit shadow-sm border border-input bg-background hover:bg-accent text-accent-foreground rounded-md",
          }}
        />
      </div>
    </aside>
  );
}
