import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { ProjectV2 } from "@/types/community";

export const projectV2ToGrant = (project: ProjectV2): IGrantResponse => {
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
  } as unknown as IGrantResponse;
};
