import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { DEFAULT_DESCRIPTION, SITE_URL, twitterMeta } from "@/utilities/meta";

const getProjectTitle = (project: ProjectResponse): string => {
  return project?.details?.title || "";
};

const getProjectDescription = (project: ProjectResponse): string => {
  return project?.details?.description || "";
};

// Base project metadata generator
export const generateProjectMetadata = (
  project: ProjectResponse,
  options: {
    title?: string;
    description?: string;
    pageName?: string;
    projectId: string;
    canonicalPath?: string;
  }
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const title =
    options.title || (options.pageName ? `${projectTitle} - ${options.pageName}` : projectTitle);

  const description =
    options.description ||
    cleanMarkdownForPlainText(getProjectDescription(project) || "", 160) ||
    DEFAULT_DESCRIPTION;

  return {
    title: { absolute: `${title} | ${PROJECT_NAME}` },
    description,
    alternates: {
      canonical: options.canonicalPath || `/project/${options.projectId}`,
    },
    twitter: {
      creator: twitterMeta.creator,
      site: twitterMeta.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${options.projectId}`,
          alt: title,
        },
      ],
    },
    openGraph: {
      url: SITE_URL,
      title,
      description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${options.projectId}`,
          alt: title,
        },
      ],
    },
  };
};

// Specific metadata generators for different page types
export const generateProjectOverviewMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    description: cleanMarkdownForPlainText(getProjectDescription(project) || "", 80),
    canonicalPath: `/project/${projectId}`,
  });
};

export const generateProjectTeamMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    pageName: "Team",
    description: `Meet the team behind ${projectTitle} and their contributions to the project.`,
    canonicalPath: `/project/${projectId}/team`,
  });
};

export const generateProjectImpactMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact of ${projectTitle}`,
    description: `Explore the impact and outcomes of ${projectTitle} on ${PROJECT_NAME}.`,
    canonicalPath: `/project/${projectId}/impact`,
  });
};

export const generateProjectContactMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    pageName: "Contact",
    description: `Contact information for ${projectTitle} project team.`,
    canonicalPath: `/project/${projectId}/contact`,
  });
};

export const generateProjectUpdatesMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} Updates`,
    description: `Explore the updates of ${projectTitle} on ${PROJECT_NAME}.`,
    canonicalPath: `/project/${projectId}/updates`,
  });
};

export const generateProjectFundingMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} Grants`,
    description: `View funding and grants for ${projectTitle} on ${PROJECT_NAME}.`,
    canonicalPath: `/project/${projectId}/grants`,
  });
};

// Helper to get grant title (V2 API structure)
const getGrantTitle = (grant: Grant): string => {
  return grant.details?.title || "";
};

// Helper to get grant description (V2 API structure)
const getGrantDescription = (grant: Grant): string => {
  return grant.details?.description || "";
};

// Grant-specific metadata generators
export const generateGrantOverviewMetadata = (
  project: ProjectResponse,
  grant: Grant,
  projectId: string,
  grantUid?: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const grantTitle = getGrantTitle(grant);
  return generateProjectMetadata(project, {
    projectId,
    title: `${grantTitle} Grant Overview | ${projectTitle}`,
    description: cleanMarkdownForPlainText(getGrantDescription(grant), 160),
    canonicalPath: grantUid
      ? `/project/${projectId}/grants/${grantUid}`
      : `/project/${projectId}/grants`,
  });
};

export const generateGrantMilestonesMetadata = (
  project: ProjectResponse,
  grant: Grant,
  projectId: string,
  grantUid?: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const grantTitle = getGrantTitle(grant);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} - Milestones and Updates for ${grantTitle}`,
    description: `View all milestones and updates by ${projectTitle} for ${grantTitle} grant.`,
    canonicalPath: grantUid
      ? `/project/${projectId}/grants/${grantUid}/milestones`
      : `/project/${projectId}/grants`,
  });
};

export const generateGrantImpactCriteriaMetadata = (
  project: ProjectResponse,
  grant: Grant,
  projectId: string,
  grantUid?: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const grantTitle = getGrantTitle(grant);
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact Criteria for ${grantTitle} Grant | ${projectTitle}`,
    description: `Impact criteria defined by ${projectTitle} for ${grantTitle} grant.`,
    canonicalPath: grantUid
      ? `/project/${projectId}/grants/${grantUid}/impact-criteria`
      : `/project/${projectId}/grants`,
  });
};

// Enhanced metadata composition functions
export const createMetadataFromContext = (
  project: ProjectResponse | null,
  projectId: string,
  metadataType: "overview" | "team" | "impact" | "contact" | "updates" | "funding",
  customOptions?: {
    title?: string;
    description?: string;
  }
): Metadata => {
  if (!project) {
    return {
      title: { absolute: `Project Not Found | ${PROJECT_NAME}` },
      description: "The requested project could not be found.",
    };
  }

  switch (metadataType) {
    case "team":
      return generateProjectTeamMetadata(project, projectId);
    case "impact":
      return generateProjectImpactMetadata(project, projectId);
    case "contact":
      return generateProjectContactMetadata(project, projectId);
    case "updates":
      return generateProjectUpdatesMetadata(project, projectId);
    case "funding":
      return generateProjectFundingMetadata(project, projectId);
    default:
      if (customOptions?.title || customOptions?.description) {
        return generateProjectMetadata(project, {
          projectId,
          title: customOptions.title,
          description: customOptions.description,
        });
      }
      return generateProjectOverviewMetadata(project, projectId);
  }
};

// Grant-specific metadata composition functions
export const createGrantMetadataFromContext = (
  project: ProjectResponse | null,
  grant: Grant | null,
  projectId: string,
  grantUid?: string,
  metadataType: "overview" | "milestones" | "impact-criteria" = "overview"
): Metadata => {
  if (!project) {
    return {
      title: { absolute: `Project Not Found | ${PROJECT_NAME}` },
      description: "The requested project could not be found.",
    };
  }

  if (!grant) {
    // If no specific grant, return funding overview
    return generateProjectFundingMetadata(project, projectId);
  }

  switch (metadataType) {
    case "milestones":
      return generateGrantMilestonesMetadata(project, grant, projectId, grantUid);
    case "impact-criteria":
      return generateGrantImpactCriteriaMetadata(project, grant, projectId, grantUid);
    default:
      return generateGrantOverviewMetadata(project, grant, projectId, grantUid);
  }
};
