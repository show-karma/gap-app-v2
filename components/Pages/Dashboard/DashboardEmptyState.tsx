"use client";

import { BanknoteArrowDown, Building2, Rocket, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

export function DashboardEmptyState() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col items-center rounded-xl border border-border p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Rocket className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Create your first project</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start tracking your grants and milestones
        </p>
        <div className="mt-4">
          <ProjectDialog
            buttonElement={{
              text: "Create project",
              styleClass: "h-9 px-4",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-border p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Run a funding program</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a community and launch your first program for free
        </p>
        <Button asChild className="mt-4">
          <Link href="/funding-map/add-program">Get started free</Link>
        </Button>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-border p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BanknoteArrowDown className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Explore funding programs</h2>
        <p className="mt-2 text-sm text-muted-foreground">Find grants and funding opportunities</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={PAGES.REGISTRY.ROOT}>Explore programs</Link>
        </Button>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-border p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Browse communities</h2>
        <p className="mt-2 text-sm text-muted-foreground">Discover ecosystems and their programs</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={PAGES.COMMUNITIES}>Browse communities</Link>
        </Button>
      </div>
    </div>
  );
}
