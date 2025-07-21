import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

/**
 * Creates a new invitation code for a project
 * @param projectIdOrSlug - The project ID or slug
 * @returns Promise with the new invitation code
 */
export const createInvitationCode = async (projectIdOrSlug: string) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECT.INVITATION.NEW_CODE(projectIdOrSlug),
    "POST"
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};

/**
 * Revokes an invitation code
 * @param projectIdOrSlug - The project ID or slug
 * @param code - The invitation code to revoke
 * @returns Promise<boolean> - Returns true if successful
 */
export const revokeInvitationCode = async (
  projectIdOrSlug: string,
  code: string
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.INVITATION.REVOKE_CODE(projectIdOrSlug, code),
    "DELETE"
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Accepts an invitation to join a project
 * @param projectIdOrSlug - The project ID or slug
 * @param code - The invitation code
 * @returns Promise<boolean> - Returns true if successful
 */
export const acceptInvitation = async (
  projectIdOrSlug: string,
  code: string
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.INVITATION.ACCEPT_LINK(projectIdOrSlug),
    "POST",
    { code }
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Gets all invitation links for a project
 * @param projectIdOrSlug - The project ID or slug
 * @returns Promise with the invitation links data
 */
export const getInvitationLinks = async (projectIdOrSlug: string) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECT.INVITATION.GET_LINKS(projectIdOrSlug)
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};

/**
 * Validates an invitation code
 * @param projectIdOrSlug - The project ID or slug
 * @param hash - The invitation code hash
 * @returns Promise with validation result
 */
export const checkInvitationCode = async (
  projectIdOrSlug: string,
  hash: string
) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECT.INVITATION.CHECK_CODE(projectIdOrSlug, hash)
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};
