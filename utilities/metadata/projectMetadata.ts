import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { DEFAULT_DESCRIPTION, SITE_URL, twitterMeta } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

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
    robots?: { index: boolean; follow: boolean };
  }
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const title =
    options.title || (options.pageName ? `${projectTitle} - ${options.pageName}` : projectTitle);

  const description =
    options.description ||
    cleanMarkdownForPlainText(getProjectDescription(project) || "", 160) ||
    DEFAULT_DESCRIPTION;

  const canonicalPath = options.canonicalPath || `/project/${options.projectId}`;

  return {
    title: { absolute: `${title} | ${PROJECT_NAME}` },
    description,
    alternates: {
      canonical: canonicalPath,
    },
    ...(options.robots && { robots: options.robots }),
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
      url: `${SITE_URL}${canonicalPath}`,
      type: "website",
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
    description: cleanMarkdownForPlainText(getProjectDescription(project) || "", 155),
    canonicalPath: `/project/${projectId}`,
  });
};

export const generateProjectAboutMetadata = (
  project: ProjectResponse,
  projectId: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    pageName: "About",
    description: `Learn about ${projectTitle}: mission, problem statement, solution, and project details.`,
    canonicalPath: `/project/${projectId}/about`,
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
    canonicalPath: `/project/${projectId}/contact-info`,
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
    canonicalPath: PAGES.PROJECT.GRANTS(projectId),
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
      ? PAGES.PROJECT.GRANT(projectId, grantUid)
      : PAGES.PROJECT.GRANTS(projectId),
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
      ? PAGES.PROJECT.MILESTONES_AND_UPDATES(projectId, grantUid)
      : PAGES.PROJECT.GRANTS(projectId),
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
      ? PAGES.PROJECT.SCREENS.SELECTED_SCREEN(projectId, grantUid, "impact-criteria")
      : PAGES.PROJECT.GRANTS(projectId),
  });
};

// Metadata for action/form pages (noindex)
export const generateGrantEditMetadata = (
  project: ProjectResponse,
  grant: Grant,
  projectId: string,
  grantUid: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const grantTitle = getGrantTitle(grant);
  return generateProjectMetadata(project, {
    projectId,
    title: `Edit ${grantTitle} Grant | ${projectTitle}`,
    description: `Edit grant details for ${grantTitle}.`,
    canonicalPath: `/project/${projectId}/funding/${grantUid}/edit`,
    robots: { index: false, follow: true },
  });
};

export const generateGrantCompleteMetadata = (
  project: ProjectResponse,
  grant: Grant,
  projectId: string,
  grantUid: string
): Metadata => {
  const projectTitle = getProjectTitle(project);
  const grantTitle = getGrantTitle(grant);
  return generateProjectMetadata(project, {
    projectId,
    title: `Complete ${grantTitle} Grant | ${projectTitle}`,
    description: `Complete grant for ${grantTitle}.`,
    canonicalPath: `/project/${projectId}/funding/${grantUid}/complete-grant`,
    robots: { index: false, follow: true },
  });
};

export const generateNewGrantMetadata = (project: ProjectResponse, projectId: string): Metadata => {
  const projectTitle = getProjectTitle(project);
  return generateProjectMetadata(project, {
    projectId,
    title: `Add New Funding | ${projectTitle}`,
    description: `Add a new grant or funding to ${projectTitle}.`,
    canonicalPath: `/project/${projectId}/funding/new`,
    robots: { index: false, follow: true },
  });
};

// Enhanced metadata composition functions
export const createMetadataFromContext = (
  project: ProjectResponse | null,
  projectId: string,
  metadataType: "overview" | "about" | "team" | "impact" | "contact" | "updates" | "funding",
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
    case "about":
      return generateProjectAboutMetadata(project, projectId);
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
  metadataType: "overview" | "milestones" | "impact-criteria" | "edit" | "complete" = "overview"
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
    case "edit":
      return generateGrantEditMetadata(project, grant, projectId, grantUid || "");
    case "complete":
      return generateGrantCompleteMetadata(project, grant, projectId, grantUid || "");
    default:
      return generateGrantOverviewMetadata(project, grant, projectId, grantUid);
  }
};
