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
          className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-emerald-100/30 dark:border-emerald-800/20 animate-pulse"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="h-2 bg-gradient-to-r from-emerald-200 to-green-200 dark:from-emerald-800 dark:to-green-800" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/30" />
              <div className="flex-1 h-5 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg" />
            </div>
            <div className="h-4 bg-emerald-100/30 dark:bg-emerald-900/20 rounded-lg mb-2 w-1/2" />
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-emerald-100/30 dark:bg-emerald-900/20 rounded-lg" />
              <div className="h-4 bg-emerald-100/30 dark:bg-emerald-900/20 rounded-lg w-3/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-emerald-100/30 dark:bg-emerald-900/20 rounded-lg" />
              <div className="h-7 w-20 bg-emerald-100/30 dark:bg-emerald-900/20 rounded-lg" />
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-green-400/30 rounded-full blur-2xl scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/30 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/30">
          <Sprout className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">Be among the first</h3>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Projects are preparing to launch Seeds. Check back soon, or launch Seeds for your own
        project.
      </p>
      <Button
        asChild
        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold px-8 py-6 seeds-glow group"
      >
        <Link href={PAGES.SEEDS_LAUNCH}>
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
              className="w-fit bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium"
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
            className="w-fit border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-xl font-medium px-6 group"
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
