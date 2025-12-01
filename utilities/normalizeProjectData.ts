/**
 * Utilities for normalizing project data between V1 and V2 API structures
 *
 * V1 structure: project.details.data.*
 * V2 structure: project.details.*
 *
 * This helps maintain backward compatibility during the migration period.
 */

import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { ProjectV2Response } from "@/types/project";

type ExternalLink = {
  type: string;
  url: string;
  name?: string;
};

export interface NormalizedProjectData {
  title: string;
  description: string;
  problem?: string;
  solution?: string;
  missionSummary?: string;
  locationOfImpact?: string;
  imageURL?: string;
  slug?: string;
  links: ExternalLink[];
  recipient?: string;
  owner?: string;
  businessModel?: string;
  stageIn?: string;
  raisedMoney?: string;
  pathToTake?: string;
  tags?: Array<{ name: string }>;
  uid?: string;
}

/**
 * Checks if a project uses V1 structure
 */
export function isV1Project(
  project: IProjectResponse | ProjectV2Response
): project is IProjectResponse {
  return (
    "details" in project &&
    project.details !== null &&
    typeof project.details === "object" &&
    "data" in project.details
  );
}

/**
 * Normalizes project data from either V1 or V2 structure to a consistent format
 */
export function normalizeProjectData(
  project: IProjectResponse | ProjectV2Response | undefined
): NormalizedProjectData | null {
  if (!project) return null;

  const isV1 = isV1Project(project);

  if (isV1) {
    const v1Project = project as IProjectResponse;
    return {
      title: v1Project.details?.data?.title || "",
      description: v1Project.details?.data?.description || "",
      problem: v1Project.details?.data?.problem,
      solution: v1Project.details?.data?.solution,
      missionSummary: v1Project.details?.data?.missionSummary,
      locationOfImpact: v1Project.details?.data?.locationOfImpact,
      imageURL: v1Project.details?.data?.imageURL,
      slug: v1Project.details?.data?.slug,
      links: v1Project.details?.data?.links || [],
      recipient: v1Project.recipient,
      owner: v1Project.recipient, // V1 uses recipient as owner
      businessModel: v1Project.details?.data?.businessModel,
      stageIn: v1Project.details?.data?.stageIn,
      raisedMoney: v1Project.details?.data?.raisedMoney,
      pathToTake: v1Project.details?.data?.pathToTake,
      tags: v1Project.details?.data?.tags,
      uid: v1Project.uid,
    };
  }

  // V2 structure
  const v2Project = project as ProjectV2Response;
  return {
    title: v2Project.details?.title || "",
    description: v2Project.details?.description || "",
    problem: v2Project.details?.problem,
    solution: v2Project.details?.solution,
    missionSummary: v2Project.details?.missionSummary,
    locationOfImpact: v2Project.details?.locationOfImpact,
    imageURL: v2Project.details?.logoUrl,
    slug: v2Project.details?.slug,
    links: v2Project.details?.links || [],
    recipient: v2Project.owner, // V2 uses owner instead of recipient
    owner: v2Project.owner,
    businessModel: v2Project.details?.businessModel,
    stageIn: v2Project.details?.stageIn,
    raisedMoney: v2Project.details?.raisedMoney,
    pathToTake: v2Project.details?.pathToTake,
    tags: v2Project.details?.tags?.map((tag) => (typeof tag === "string" ? { name: tag } : tag)),
    uid: v2Project.uid,
  };
}

/**
 * Extracts a specific link type from normalized links
 */
export function getLinkByType(links: ExternalLink[], type: string): string {
  return links.find((link) => link.type === type)?.url || "";
}

/**
 * Extracts custom links from normalized links
 */
export function getCustomLinks(links: ExternalLink[]): Array<{ name: string; url: string }> {
  return links
    .filter((link) => link.type === "custom" && link.name)
    .map((link) => ({
      name: link.name || "",
      url: link.url,
    }));
}

/**
 * Gets the project identifier (slug or uid)
 */
export function getProjectIdentifier(
  project: IProjectResponse | ProjectV2Response | undefined
): string {
  if (!project) return "";

  const normalized = normalizeProjectData(project);
  return normalized?.slug || normalized?.uid || "";
}
