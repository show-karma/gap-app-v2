"use client";

import { ArrowRight, Sprout } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import {
  type SeedsProject,
  SeedsProjectCard,
} from "@/src/features/seeds/components/seeds-project-card";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 animate-pulse"
        >
          <div className="h-2 bg-gray-200 dark:bg-zinc-700" />
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
              <div className="flex-1 h-5 bg-gray-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded mb-2 w-1/2" />
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <Sprout className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-2">Be among the first</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Projects are preparing to launch Seeds. Check back soon, or launch Seeds for your own
        project.
      </p>
      <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
        <Link href={PAGES.SEEDS_LAUNCH}>
          <Sprout className="w-4 h-4 mr-2" />
          Launch Seeds
        </Link>
      </Button>
    </div>
  );
}

export function SeedsProjectsSection() {
  const [projects, setProjects] = useState<SeedsProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/v2/projects?limit=8");
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <section
      id="projects"
      className={cn(marketingLayoutTheme.padding, "py-16 w-full scroll-mt-20")}
    >
      <SectionContainer maxWidth="wide">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div className="flex flex-col gap-4">
            <Badge
              variant="secondary"
              className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
            >
              Featured Projects
            </Badge>
            <h2 className="section-title text-foreground">Projects accepting Seeds</h2>
            <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-2xl">
              Back the projects you believe in. Seeds live in your wallet as proof of early support.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-fit border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/50"
          >
            <Link href={PAGES.PROJECTS_EXPLORER}>
              View All Projects
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <ProjectsSkeleton />
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <SeedsProjectCard key={project.uid} project={project} />
            ))}
          </div>
        )}
      </SectionContainer>
    </section>
  );
}
