import React, { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { IProjectResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';
import { gapIndexerApi } from '@/utilities/gapIndexerApi';
import { zeroUID } from '@/utilities/commons';
import { ProjectProvider, ProjectContextData } from '@/contexts/ProjectContext';
import ProjectDataErrorBoundary from './ProjectDataErrorBoundary';

export interface ProjectDataProviderProps {
  projectId: string;
  children: ReactNode;
}

// Server component that fetches project data
export const ProjectDataProvider = async ({ 
  projectId, 
  children
}: ProjectDataProviderProps) => {
  let project: IProjectResponse | null = null;
  let loading = false;
  let error: string | null = null;

  try {
    loading = true;
    const response = await gapIndexerApi.projectBySlug(projectId);
    project = response.data;
    
    if (!project || project.uid === zeroUID) {
      notFound();
    }
    loading = false;
  } catch (err) {
    loading = false;
    error = err instanceof Error ? err.message : 'Failed to fetch project data';
    console.error('ProjectDataProvider: Failed to fetch project data:', err);
    notFound();
  }

  const contextValue: ProjectContextData = {
    project,
    loading,
    error,
  };

  return (
    <ProjectDataErrorBoundary>
      <ProjectProvider value={contextValue}>
        {children}
      </ProjectProvider>
    </ProjectDataErrorBoundary>
  );
}; 