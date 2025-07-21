import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

/**
 * Updates external links for a project
 * @param projectUID - The project UID
 * @param linkType - The type of link to update
 * @param value - The value to set
 * @returns Promise<boolean> - Returns true if successful
 */
export const updateExternalLink = async (
  projectUID: string,
  linkType: "github" | "oso" | "divvi" | "contractAddress",
  value: string | null
): Promise<boolean> => {
  const payload: Record<string, string | null> = {};

  switch (linkType) {
    case "github":
      payload.github = value;
      break;
    case "oso":
      payload.osoSlug = value;
      break;
    case "divvi":
      payload.divviWallet = value;
      break;
    case "contractAddress":
      payload.contractAddress = value;
      break;
  }

  const [, error] = await fetchData(
    INDEXER.PROJECT.EXTERNAL.UPDATE(projectUID),
    "PUT",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Links a GitHub repository to a project
 * @param projectUID - The project UID
 * @param repoUrl - The GitHub repository URL
 * @returns Promise<boolean> - Returns true if successful
 */
export const linkGithubRepo = async (
  projectUID: string,
  repoUrl: string
): Promise<boolean> => {
  return updateExternalLink(projectUID, "github", repoUrl);
};

/**
 * Links an OSO profile to a project
 * @param projectUID - The project UID
 * @param osoSlug - The OSO profile slug
 * @returns Promise<boolean> - Returns true if successful
 */
export const linkOSOProfile = async (
  projectUID: string,
  osoSlug: string
): Promise<boolean> => {
  return updateExternalLink(projectUID, "oso", osoSlug);
};

/**
 * Links a Divvi wallet to a project
 * @param projectUID - The project UID
 * @param walletAddress - The Divvi wallet address
 * @returns Promise<boolean> - Returns true if successful
 */
export const linkDivviWallet = async (
  projectUID: string,
  walletAddress: string
): Promise<boolean> => {
  return updateExternalLink(projectUID, "divvi", walletAddress);
};

/**
 * Links a contract address to a project
 * @param projectUID - The project UID
 * @param contractAddress - The contract address
 * @returns Promise<boolean> - Returns true if successful
 */
export const linkContractAddress = async (
  projectUID: string,
  contractAddress: string
): Promise<boolean> => {
  return updateExternalLink(projectUID, "contractAddress", contractAddress);
};
