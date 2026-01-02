import type {
  CreateProgramFormData,
  ProgramApprovalRequest,
  ProgramCreationRequest,
  ProgramCreationResult,
  ProgramMetadata,
} from "@/types/program-registry";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Program Registry Service
 * Handles business logic for program creation and approval
 * Following Domain-Driven Design principles
 */
export class ProgramRegistryService {
  /**
   * Build program metadata from form data and community
   */
  static buildProgramMetadata(
    formData: CreateProgramFormData,
    community: Community
  ): ProgramMetadata {
    return {
      title: formData.name,
      description: formData.description,
      shortDescription: formData.shortDescription,
      programBudget: formData.budget,
      startsAt: formData.dates.startsAt,
      endsAt: formData.dates.endsAt,
      website: "",
      projectTwitter: "",
      socialLinks: {
        twitter: "",
        website: "",
        discord: "",
        orgWebsite: "",
        blog: "",
        forum: "",
        grantsSite: "",
        telegram: "",
      },
      bugBounty: "",
      categories: [],
      ecosystems: [],
      organizations: [],
      networks: [],
      grantTypes: [],
      platformsUsed: [],
      logoImg: "",
      bannerImg: "",
      logoImgData: {},
      bannerImgData: {},
      credentials: {},
      status: "Active",
      type: "program",
      tags: ["karma-gap", "grant-program-registry"],
      communityRef: [community.uid], // Use community UID (hex address), not slug
    };
  }

  /**
   * Extract program ID from various response formats
   * Handles different API response structures
   */
  static extractProgramId(response: unknown): string | undefined {
    if (!response) return undefined;

    // Handle different response formats:
    // 1. { _id: { $oid: "..." } }
    if (
      typeof response === "object" &&
      response !== null &&
      "_id" in response &&
      typeof (response as { _id?: { $oid?: string } })._id === "object" &&
      (response as { _id: { $oid?: string } })._id?.$oid
    ) {
      return (response as { _id: { $oid: string } })._id.$oid;
    }

    // 2. { program: { _id: { $oid: "..." } } }
    if (
      typeof response === "object" &&
      response !== null &&
      "program" in response &&
      typeof (response as { program?: { _id?: { $oid?: string } } }).program === "object" &&
      (response as { program: { _id: { $oid?: string } } }).program?._id?.$oid
    ) {
      return (response as { program: { _id: { $oid: string } } }).program._id.$oid;
    }

    // 3. { id: "..." }
    if (
      typeof response === "object" &&
      response !== null &&
      "id" in response &&
      typeof (response as { id?: unknown }).id === "string"
    ) {
      return (response as { id: string }).id;
    }

    // 4. "..." (string ID)
    if (typeof response === "string") {
      return response;
    }

    return undefined;
  }

  /**
   * Create a program
   */
  static async createProgram(
    owner: string,
    chainId: number,
    metadata: ProgramMetadata
  ): Promise<ProgramCreationResult> {
    const request: ProgramCreationRequest = {
      owner,
      chainId,
      metadata,
    };

    const [createResponse, createError] = await fetchData(
      INDEXER.REGISTRY.CREATE,
      "POST",
      request,
      {},
      {},
      true
    );

    if (createError) {
      throw new Error(createError);
    }

    const programId = ProgramRegistryService.extractProgramId(createResponse);

    if (!programId) {
      // If we can't get the ID immediately, return success but indicate manual approval needed
      return {
        programId: "",
        success: true,
        requiresManualApproval: true,
      };
    }

    return {
      programId,
      success: true,
      requiresManualApproval: false,
    };
  }

  /**
   * Approve a program
   */
  static async approveProgram(programId: string): Promise<void> {
    const request: ProgramApprovalRequest = {
      id: programId,
      isValid: "accepted",
    };

    const [_approveResponse, approveError] = await fetchData(
      INDEXER.REGISTRY.APPROVE,
      "POST",
      request,
      {},
      {},
      true
    );

    if (approveError) {
      throw new Error(approveError);
    }
  }
}
