'use client';

import { useEffect, useState } from 'react';
import { IProjectResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';

import { useProjectStore } from '@/store';

interface ProjectStoreInitializerProps {
  project: IProjectResponse;
}

export function ProjectStoreInitializer({
  project,
}: ProjectStoreInitializerProps) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && project) {
      useProjectStore.setState({ 
        project,
        loading: false
      });
      setInitialized(true);
    }
  }, [project, initialized]);

  return null;
} 