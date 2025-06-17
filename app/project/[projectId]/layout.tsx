/* eslint-disable @next/next/no-img-element */
"use client";
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import ProjectHeaderLoading from "@/components/Pages/Project/Loading/Header";
import { Suspense, useEffect, useState } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useProjectStore } from "@/store";
import { notFound, redirect, useParams, useRouter } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { ClientMetadata } from "@/components/Pages/Project/ClientMetadata";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProjectData] = useState<IProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { setProject, project: cachedProject } = useProjectStore();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setLoadingProgress(10);

        // Check if we already have this project cached
        if (cachedProject && 
            (cachedProject.uid === projectId || 
             cachedProject.details?.data?.slug === projectId)) {
          setProjectData(cachedProject);
          setProject(cachedProject);
          setLoadingProgress(100);
          setIsLoading(false);
          return;
        }

        setLoadingProgress(30);
        
        const projectData = await gapIndexerApi
          .projectBySlug(projectId)
          .then((res) => {
            setLoadingProgress(60);
            return res.data;
          });

        setLoadingProgress(80);

        if (!projectData || projectData.uid === zeroUID) {
          setError("Project not found");
          return;
        }

        // Handle redirects for merged projects
        if (projectData?.pointers && projectData?.pointers?.length > 0) {
          const original = await gapIndexerApi
            .projectBySlug(projectData.pointers[0].data?.ogProjectUID)
            .then((res) => res.data)
            .catch(() => null);
          if (original) {
            router.replace(`/project/${original.details?.data?.slug}`);
            return;
          }
        }

        setLoadingProgress(90);
        setProjectData(projectData);
        setProject(projectData);
        setLoadingProgress(100);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError("Failed to load project");
      } finally {
        // Small delay to show progress completion
        setTimeout(() => setIsLoading(false), 100);
      }
    };

    fetchProject();
  }, [projectId, setProject, cachedProject, router]);

  // Show enhanced loading skeleton with progress
  if (isLoading || !project) {
    return (
      <div className="flex flex-col gap-0">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <ProjectHeaderLoading />
        <div className="px-4 sm:px-6 lg:px-12">
          <div className="flex flex-row max-lg:flex-col gap-6 max-md:gap-4 py-5 mb-20">
            {/* Enhanced Team Section Skeleton */}
            <div className="flex flex-[2.5] gap-6 flex-col w-full max-lg:hidden">
              <div className="flex flex-col gap-2 w-full min-w-48">
                <div className="flex flex-col border border-zinc-200 divide-y divide-y-zinc-200 rounded-xl">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex flex-col divide-y divide-y-zinc-200">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center flex-row gap-3 p-3">
                        <div className="relative">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Content Section */}
            <div className="flex flex-col flex-[7.5] max-lg:w-full gap-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              
              {/* Tabs skeleton */}
              <div className="flex space-x-4 border-b border-gray-200">
                {['Overview', 'Updates', 'Impact', 'Team'].map((tab, i) => (
                  <div key={tab} className="pb-2">
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Stats Section */}
            <div className="flex flex-col flex-[4] gap-8 max-lg:w-full">
              <div className="flex flex-col gap-1">
                <p className="text-black dark:text-zinc-400 font-bold text-sm">
                  This project has received
                </p>
                <div className="flex flex-row max-lg:flex-col gap-4">
                  <div className="flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] border-l-[4px] p-4">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-10 w-12 rounded-lg" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] border-l-[4px] p-4">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-10 w-12 rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-0">
      <ClientMetadata project={project} projectId={projectId} />
      <Suspense fallback={<ProjectHeaderLoading />}>
        <ProjectWrapper projectId={projectId} project={project} />
      </Suspense>
      <div className="px-4 sm:px-6 lg:px-12">{children}</div>
    </div>
  );
}
