"use client"
import { useProject } from "@/hooks/useProject"
import ProjectHeaderLoading from "./Loading/Header"
import { ProjectWrapper } from "./ProjectWrapper"

interface ProjectWrapperWithLoadingProps {
  projectId: string
}

export const ProjectWrapperWithLoading = ({ projectId }: ProjectWrapperWithLoadingProps) => {
  const { project, isLoading } = useProject(projectId)

  // Show loading state during initial hydration or when data is loading
  if (isLoading || !project) {
    return <ProjectHeaderLoading />
  }

  return <ProjectWrapper projectId={projectId} />
}
