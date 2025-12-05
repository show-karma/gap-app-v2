import type { Project } from "@/types/v2/community";
import type { GrantResponse } from "@/types/v2/grant";

export const projectToGrant = (project: Project): GrantResponse => {
  return {
    uid: project.uid,
    createdAt: project.createdAt,
    updatedAt: project.createdAt,
    refUID: project.uid,
    id: project.uid,
    type: "grant",
    data: {
      communityUID: "",
    },
    details: {
      data: {
        title: project.grantNames?.[0] || "Grant",
        description: project.details.description,
        selectedTrackIds: [],
        programId: "",
      },
    },
    project: {
      uid: project.uid,
      details: {
        data: {
          title: project.details.title,
          description: project.details.description,
          imageURL: project.details.logoUrl,
          slug: project.details.slug,
        },
      },
    },
    community: {
      uid: "",
      details: {
        data: {
          name: "",
          description: "",
        },
      },
    },
    members: project.members.map((member) => ({
      uid: member.address,
      address: member.address,
      role: member.role,
    })),
    milestones: Array.from({ length: project.numMilestones }, (_, index) => ({
      uid: `milestone-${index}`,
      completed: index < Math.floor((project.percentCompleted / 100) * project.numMilestones),
      createdAt: project.createdAt,
      data: {
        title: `Milestone ${index + 1}`,
        description: "",
      },
    })),
    updates: Array.from({ length: project.numUpdates }, (_, index) => ({
      uid: `update-${index}`,
      createdAt: project.createdAt,
      data: {
        title: `Update ${index + 1}`,
        text: "",
      },
    })),
    categories: project.categories || [],
    chainID: 0,
    completed: null,
    schema: "",
    schemaUID: "",
    attestationUID: "",
    txHash: "",
    attester: "",
    recipient: "",
    resolver: "",
    revocable: false,
    revocationTime: null,
    expirationTime: null,
    revoked: false,
    decodedDataJson: "",
    isOffchain: false,
    schemaId: "",
  } as unknown as GrantResponse;
};

// Alias for backward compatibility during migration
export const projectV2ToGrant = projectToGrant;
