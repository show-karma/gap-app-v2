import { Metadata } from 'next';
import { IProjectResponse, IGrantResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';
import { defaultMetadata } from '../meta';
import { envVars } from '../enviromentVars';
import { cleanMarkdownForPlainText } from '../markdown';

// Base project metadata generator
export const generateProjectMetadata = (
  project: IProjectResponse,
  options: {
    title?: string;
    description?: string;
    pageName?: string;
    projectId: string;
  }
): Metadata => {
  const title = options.title || 
    (options.pageName ? 
      `${project.details?.data?.title} ${options.pageName} | Karma GAP` : 
      `${project.details?.data?.title} | Karma GAP`
    );
  
  const description = options.description || 
    cleanMarkdownForPlainText(project.details?.data?.description || '', 160) || 
    defaultMetadata.description;

  return {
    title,
    description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: 'summary_large_image',
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
export const generateProjectOverviewMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `${project.details?.data?.title} | Karma GAP`,
    description: cleanMarkdownForPlainText(project.details?.data?.description || '', 80),
  });
};

export const generateProjectTeamMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    pageName: 'Team',
    description: `Meet the team behind ${project.details?.data?.title} and their contributions to the project.`,
  });
};

export const generateProjectImpactMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact of ${project.details?.data?.title} | Karma GAP`,
    description: `Explore the impact and outcomes of ${project.details?.data?.title} on Karma GAP.`,
  });
};

export const generateProjectContactMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    pageName: 'Contact',
    description: `Contact information for ${project.details?.data?.title} project team.`,
  });
};

export const generateProjectUpdatesMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `${project.details?.data?.title} Updates | Karma GAP`,
    description: `Explore the updates of ${project.details?.data?.title} on Karma GAP.`,
  });
};

export const generateProjectFundingMetadata = (project: IProjectResponse, projectId: string): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `${project.details?.data?.title} Grants | Karma GAP`,
    description: `View funding and grants for ${project.details?.data?.title} on Karma GAP.`,
  });
};

// Grant-specific metadata generators
export const generateGrantOverviewMetadata = (
  project: IProjectResponse, 
  grant: IGrantResponse, 
  projectId: string
): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `${grant.details?.data?.title} Grant Overview | ${project.details?.data?.title} | Karma GAP`,
    description: cleanMarkdownForPlainText(grant.details?.data?.description || '', 160),
  });
};

export const generateGrantMilestonesMetadata = (
  project: IProjectResponse, 
  grant: IGrantResponse, 
  projectId: string
): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `${project.details?.data?.title} - Milestones and Updates for ${grant.details?.data?.title} | Karma GAP`,
    description: `View all milestones and updates by ${project.details?.data?.title} for ${grant.details?.data?.title} grant.`,
  });
};

export const generateGrantImpactCriteriaMetadata = (
  project: IProjectResponse, 
  grant: IGrantResponse, 
  projectId: string
): Metadata => {
  return generateProjectMetadata(project, {
    projectId,
    title: `Impact Criteria for ${grant.details?.data?.title} Grant | ${project.details?.data?.title} | Karma GAP`,
    description: `Impact criteria defined by ${project.details?.data?.title} for ${grant.details?.data?.title} grant.`,
  });
};

// Enhanced metadata composition functions
export const createMetadataFromContext = (
  project: IProjectResponse | null,
  projectId: string,
  metadataType: 'overview' | 'team' | 'impact' | 'contact' | 'updates' | 'funding',
  customOptions?: {
    title?: string;
    description?: string;
  }
): Metadata => {
  if (!project) {
    return {
      title: 'Project Not Found | Karma GAP',
      description: 'The requested project could not be found.',
      icons: defaultMetadata.icons,
    };
  }

  switch (metadataType) {
    case 'team':
      return generateProjectTeamMetadata(project, projectId);
    case 'impact':
      return generateProjectImpactMetadata(project, projectId);
    case 'contact':
      return generateProjectContactMetadata(project, projectId);
    case 'updates':
      return generateProjectUpdatesMetadata(project, projectId);
    case 'funding':
      return generateProjectFundingMetadata(project, projectId);
    case 'overview':
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
  project: IProjectResponse | null,
  grant: IGrantResponse | null,
  projectId: string,
  grantUid?: string,
  metadataType: 'overview' | 'milestones' | 'impact-criteria' = 'overview'
): Metadata => {
  if (!project) {
    return {
      title: 'Project Not Found | Karma GAP',
      description: 'The requested project could not be found.',
      icons: defaultMetadata.icons,
    };
  }

  if (!grant) {
    // If no specific grant, return funding overview
    return generateProjectFundingMetadata(project, projectId);
  }

  switch (metadataType) {
    case 'milestones':
      return generateGrantMilestonesMetadata(project, grant, projectId);
    case 'impact-criteria':
      return generateGrantImpactCriteriaMetadata(project, grant, projectId);
    case 'overview':
    default:
      return generateGrantOverviewMetadata(project, grant, projectId);
  }
}; 