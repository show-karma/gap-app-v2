import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import type { ProjectV2Response } from "@/types/project";
import type { GrantResponse } from "@/types/v2/grant";
import { envVars } from "../enviromentVars";
import { cleanMarkdownForPlainText } from "../markdown";
import { defaultMetadata } from "../meta";

const getProjectTitle = (project: ProjectV2Response): string => {
  return project?.details?.title || "";
};

const getProjectDescription = (project: ProjectV2Response): string => {
  return project?.details?.description || "";
};

// Base project metadata generator
export const generateProjectMetadata = (
  project: ProjectV2Response,
  options: {
    title?: string;
    description?: string;
    pageName?: string;
    projectId: string;
  }
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const title =
    options.title ||
    (options.pageName
      ? `${projectTitle} ${options.pageName} | ${PROJECT_NAME}`
      : `${projectTitle} | ${PROJECT_NAME}`);

  const description =
    options.description ||
    cleanMarkdownForPlainText(getProjectDescription(project) || "", 160) ||
    defaultMetadata.description;

  return {
    title,
    description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${options.projectId}`,
          alt: title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title,
      description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${options.projectId}`,
          alt: title,
        },
      ],
    },
    icons: defaultMetadata.icons,
  };
};

// Specific metadata generators for different page types
export const generateProjectOverviewMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} | ${PROJECT_NAME}`,
    description: cleanMarkdownForPlainText(getProjectDescription(project) || "", 80),
  });
};

export const generateProjectTeamMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    pageName: "Team",
    description: `Meet the team behind ${projectTitle} and their contributions to the project.`,
  });
};

export const generateProjectImpactMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact of ${projectTitle} | ${PROJECT_NAME}`,
    description: `Explore the impact and outcomes of ${projectTitle} on ${PROJECT_NAME}.`,
  });
};

export const generateProjectContactMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    pageName: "Contact",
    description: `Contact information for ${projectTitle} project team.`,
  });
};

export const generateProjectUpdatesMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} Updates | ${PROJECT_NAME}`,
    description: `Explore the updates of ${projectTitle} on ${PROJECT_NAME}.`,
  });
};

export const generateProjectFundingMetadata = (
  project: ProjectV2Response,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} Grants | ${PROJECT_NAME}`,
    description: `View funding and grants for ${projectTitle} on ${PROJECT_NAME}.`,
  });
};

// Grant-specific metadata generators
export const generateGrantOverviewMetadata = (
  project: ProjectV2Response,
  grant: GrantResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${grant.details?.data?.title} Grant Overview | ${projectTitle} | ${PROJECT_NAME}`,
    description: cleanMarkdownForPlainText(grant.details?.data?.description || "", 160),
  });
};

export const generateGrantMilestonesMetadata = (
  project: ProjectV2Response,
  grant: GrantResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `${projectTitle} - Milestones and Updates for ${grant.details?.data?.title} | ${PROJECT_NAME}`,
    description: `View all milestones and updates by ${projectTitle} for ${grant.details?.data?.title} grant.`,
  });
};

export const generateGrantImpactCriteriaMetadata = (
  project: ProjectV2Response,
  grant: GrantResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact Criteria for ${grant.details?.data?.title} Grant | ${projectTitle} | ${PROJECT_NAME}`,
    description: `Impact criteria defined by ${projectTitle} for ${grant.details?.data?.title} grant.`,
  });
};

// Enhanced metadata composition functions
export const createMetadataFromContext = (
  project: ProjectV2Response | null,
  projectId: string,
  metadataType: "overview" | "team" | "impact" | "contact" | "updates" | "funding",
  customOptions?: {
    title?: string;
    description?: string;
  }
): Metadata => {
  if (!project) {
    return {
      title: `Project Not Found | ${PROJECT_NAME}`,
      description: "The requested project could not be found.",
      icons: defaultMetadata.icons,
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
  project: ProjectV2Response | null,
  grant: GrantResponse | null,
  projectId: string,
  _grantUid?: string,
  metadataType: "overview" | "milestones" | "impact-criteria" = "overview"
): Metadata => {
  if (!project) {
    return {
      title: `Project Not Found | ${PROJECT_NAME}`,
      description: "The requested project could not be found.",
      icons: defaultMetadata.icons,
    };
  }

  if (!grant) {
    // If no specific grant, return funding overview
    return generateProjectFundingMetadata(project, projectId);
  }

  switch (metadataType) {
    case "milestones":
      return generateGrantMilestonesMetadata(project, grant, projectId);
    case "impact-criteria":
      return generateGrantImpactCriteriaMetadata(project, grant, projectId);
    default:
      return generateGrantOverviewMetadata(project, grant, projectId);
  }
};
