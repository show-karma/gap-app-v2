"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { IProjectResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';

// Define the shape of our project context data
export interface ProjectContextData {
  project: IProjectResponse | null;
  loading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
}

// Create the context with default values
const ProjectContext = createContext<ProjectContextData>({
  project: null,
  loading: true,
  error: null,
});

// Custom hook to use the project context
export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

// Provider props interface
export interface ProjectProviderProps {
  children: ReactNode;
  value: ProjectContextData;
}

// Project provider component
export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children, value }) => {
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export default ProjectContext; 