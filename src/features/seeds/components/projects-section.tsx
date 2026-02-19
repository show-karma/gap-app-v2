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
          className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-seeds-300/20 dark:border-seeds-300/10 animate-pulse"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="h-2 bg-gradient-to-r from-seeds-300/50 to-seeds-300/30 dark:from-seeds-300/30 dark:to-seeds-300/20" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-seeds-300/20 dark:bg-seeds-300/10" />
              <div className="flex-1 h-5 bg-seeds-300/20 dark:bg-seeds-300/10 rounded-lg" />
            </div>
            <div className="h-4 bg-seeds-300/15 dark:bg-seeds-300/10 rounded-lg mb-2 w-1/2" />
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-seeds-300/15 dark:bg-seeds-300/10 rounded-lg" />
              <div className="h-4 bg-seeds-300/15 dark:bg-seeds-300/10 rounded-lg w-3/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-seeds-300/15 dark:bg-seeds-300/10 rounded-lg" />
              <div className="h-7 w-20 bg-seeds-300/15 dark:bg-seeds-300/10 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/30 to-seeds-300/30 rounded-full blur-2xl scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-seeds-300/20 to-seeds-300/10 dark:from-seeds-300/30 dark:to-seeds-300/10 flex items-center justify-center border border-seeds-300/30 dark:border-seeds-300/20">
          <Sprout className="w-12 h-12 text-seeds-400 dark:text-seeds-300" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">Be among the first</h3>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Projects are preparing to launch Seeds. Check back soon, or launch Seeds for your own
        project.
      </p>
      <Button
        asChild
        className="bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-semibold px-8 py-6 seeds-glow group"
      >
        <Link href={PAGES.SEEDS}>
          <Sprout className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
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
      className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full scroll-mt-20")}
    >
      <SectionContainer maxWidth="wide">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="flex flex-col gap-5">
            <Badge
              variant="secondary"
              className="w-fit bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
            >
              Featured Projects
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Projects accepting Seeds
            </h2>
            <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-2xl">
              Back the projects you believe in. Seeds live in your wallet as proof of early support.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-fit border-seeds-300 text-seeds-400 hover:bg-seeds-300/10 dark:border-seeds-300/50 dark:text-seeds-300 dark:hover:bg-seeds-300/10 rounded-xl font-medium px-6 group"
          >
            <Link href={PAGES.PROJECTS_EXPLORER}>
              View All Projects
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
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
