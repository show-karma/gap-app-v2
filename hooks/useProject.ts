import { useProjectStore } from '@/store';

export const useProject = () => {
  const { project, loading, refreshProject } = useProjectStore();

  return {
    project,
    isLoading: loading,
    error: null,
    refetch: refreshProject,
    isError: false,
  };
};
