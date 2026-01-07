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
   * Handles different API response structures (V1 and V2)
   */
  static extractProgramId(response: unknown): string | undefined {
    if (!response) return undefined;

    // V2 format: { programId: "..." }
    if (
      typeof response === "object" &&
      response !== null &&
      "programId" in response &&
      typeof (response as { programId?: unknown }).programId === "string"
    ) {
      return (response as { programId: string }).programId;
    }

    // Handle different V1 response formats:
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
   * Extract MongoDB ID (for approve endpoint which still uses _id)
   */
  static extractMongoId(response: unknown): string | undefined {
    if (!response) return undefined;

    // V2 format: { id: "..." } (MongoDB _id)
    if (
      typeof response === "object" &&
      response !== null &&
      "id" in response &&
      typeof (response as { id?: unknown }).id === "string"
    ) {
      return (response as { id: string }).id;
    }

    // V1 format: { _id: { $oid: "..." } }
    if (
      typeof response === "object" &&
      response !== null &&
      "_id" in response &&
      typeof (response as { _id?: { $oid?: string } })._id === "object" &&
      (response as { _id: { $oid?: string } })._id?.$oid
    ) {
      return (response as { _id: { $oid: string } })._id.$oid;
    }

    return undefined;
  }

  /**
   * Create a program (V2 endpoint)
   */
  static async createProgram(
    owner: string,
    chainId: number,
    metadata: ProgramMetadata
  ): Promise<ProgramCreationResult> {
    // V2 endpoint expects: { chainId, metadata }
    // owner comes from JWT session
    const request = {
      chainId,
      metadata,
    };

    const [createResponse, createError] = await fetchData(
      INDEXER.REGISTRY.V2.CREATE,
      "POST",
      request,
      {},
      {},
      true
    );

    if (createError) {
      throw new Error(createError);
    }

    // V2 response: { programId: "...", isValid: true | null, ... }
    const programId = ProgramRegistryService.extractProgramId(createResponse);
    const isValid =
      typeof createResponse === "object" && createResponse !== null && "isValid" in createResponse
        ? (createResponse as { isValid?: unknown }).isValid
        : null;

    if (!programId) {
      // If we can't get the ID immediately, return success but indicate manual approval needed
      return {
        programId: "",
        success: true,
        requiresManualApproval: true,
      };
    }

    // If program is auto-approved (isValid: true), no manual approval needed
    const requiresManualApproval = isValid !== true;

    return {
      programId,
      success: true,
      requiresManualApproval,
    };
  }

  /**
   * Update a program (V2 endpoint)
   */
  static async updateProgram(programId: string, metadata: ProgramMetadata): Promise<void> {
    const request = {
      metadata,
    };

    const [, updateError] = await fetchData(
      INDEXER.REGISTRY.V2.UPDATE(programId),
      "PUT",
      request,
      {},
      {},
      true
    );

    if (updateError) {
      throw new Error(updateError);
    }
  }

  /**
   * Approve/reject/pending a program (V2 endpoint)
   * Uses programId only (chainId removed from endpoint)
   */
  static async approveProgram(
    programId: string,
    isValid: "accepted" | "rejected" | "pending" = "accepted"
  ): Promise<void> {
    const request = {
      programId,
      isValid,
    };

    const [_approveResponse, approveError] = await fetchData(
      INDEXER.REGISTRY.V2.APPROVE,
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
