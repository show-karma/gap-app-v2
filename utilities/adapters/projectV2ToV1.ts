import { IProjectResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';

// V2 Project API Response structure
export interface ProjectV2Response {
  uid: string;
  chainID: number;
  owner: string;
  payoutAddress?: string;
  details: {
    title: string;
    description: string;
    problem?: string;
    solution?: string;
    missionSummary?: string;
    locationOfImpact?: string;
    slug: string;
    logoUrl?: string;
    businessModel?: string;
    stageIn?: string;
    raisedMoney?: string;
    pathToTake?: string;
    tags?: string[];
    links?: Array<{
      url: string;
      type: string;
    }>;
    lastDetailsUpdate?: string;
  };
  external?: {
    gitcoin?: any[];
    oso?: any[];
    divvi_wallets?: any[];
    github?: any[];
    network_addresses?: any[];
  };
  members: Array<{
    address: string;
    role: string;
    joinedAt: string;
  }>;
  endorsements?: any[];
  milestones?: any[];
  impacts?: any[];
  updates?: any[];
  communities?: string[];
}

/**
 * Transforms v2 project API response to v1 IProjectResponse format
 * This adapter maintains compatibility with existing codebase that expects v1 structure
 */
export function projectV2ToV1(
  v2Project: ProjectV2Response,
  grants: any[] = []
): IProjectResponse {
  const now = new Date().toISOString();

  return {
    uid: v2Project.uid,
    id: v2Project.uid, // Add id field
    schemaUID: '', // Not available in v2
    refUID:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    attester: v2Project.owner,
    recipient: v2Project.owner, // Map owner to recipient
    grantee: v2Project.owner, // Add grantee field
    revoked: false,
    revocable: false, // Add revocable field
    revocationTime: 0,
    createdAt: now,
    updatedAt: now,
    chainID: v2Project.chainID,
    type: 'Project',
    data: {
      project: true
    },
    txid: '', // Not available in v2
    processed: false,
    decodedDataJson: '', // Add decodedDataJson field
    isOffchain: false, // Add isOffchain field
    schemaId: '', // Add schemaId field
    details: {
      uid: v2Project.uid, // Use project uid as details uid
      id: v2Project.uid, // Add id field
      schemaUID: '',
      refUID: v2Project.uid,
      attester: v2Project.owner,
      recipient: v2Project.owner,
      revoked: false,
      revocable: false, // Add revocable field
      revocationTime: 0,
      createdAt: v2Project.details.lastDetailsUpdate || now,
      updatedAt: v2Project.details.lastDetailsUpdate || now,
      chainID: v2Project.chainID,
      type: 'ProjectDetails',
      data: {
        title: v2Project.details.title,
        description: v2Project.details.description || '',
        imageURL: v2Project.details.logoUrl || '',
        links: v2Project.details.links || [],
        slug: v2Project.details.slug,
        problem: v2Project.details.problem || '',
        solution: v2Project.details.solution || '',
        missionSummary: v2Project.details.missionSummary || '',
        type: 'project-details'
      },
      txid: '',
      processed: false,
      decodedDataJson: '', // Add decodedDataJson field
      isOffchain: false, // Add isOffchain field
      schemaId: '' // Add schemaId field
    },
    symlinks: [],
    grants: grants || [],
    milestones: [], // Add milestones field (project-level milestones)
    impacts: v2Project.impacts || [],
    project_milestones: [],
    updates: v2Project.updates || [],
    endorsements: v2Project.endorsements || [],
    pointers: [], // Not available in v2 API
    members: (v2Project.members || []).map((member) => ({
      uid: member.address, // Use address as uid
      schemaUID: '',
      refUID: v2Project.uid,
      attester: v2Project.owner,
      recipient: member.address, // Map address to recipient
      revoked: false,
      revocationTime: 0,
      createdAt: member.joinedAt,
      updatedAt: member.joinedAt,
      chainID: v2Project.chainID,
      type: 'MemberOf',
      data: {
        memberOf: true
      },
      txid: '',
      processed: false
    })),
    categories: [] // Not available in v2 response
  } as unknown as IProjectResponse;
}
