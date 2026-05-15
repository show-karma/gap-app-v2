import { chainIdToNetwork, Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { ethers } from "ethers";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getRPCUrlByChainId } from "./rpcClient";

export interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
  role?: "Owner" | "Admin" | "Member";
}

// Minimal slice of ProjectResolver — `projectAdmins` and `projectOwner` are
// the raw mappings. We avoid `isOwner`/`isAdmin` because both views are
// deliberately permissive on-chain (admins also pass `isOwner`), which is
// what made the previous implementation label every member as "Owner".
const PROJECT_RESOLVER_ABI = [
  "function projectAdmins(bytes32 projectId, address addr) view returns (bool)",
  "function projectOwner(bytes32 projectId) view returns (address)",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const getProjectMemberRoles = async (
  project: ProjectResponse,
): Promise<Record<string, Member["role"]>> => {
  const roles: Record<string, Member["role"]> = {};
  if (!project) return roles;

  const indexerOwner = project.owner?.toLowerCase();
  const memberAddresses = (project.members || [])
    .map((m) => m.address?.toLowerCase())
    .filter((a): a is string => Boolean(a));

  const networkName = chainIdToNetwork[project.chainID as keyof typeof chainIdToNetwork];
  const network = networkName ? Networks[networkName as keyof typeof Networks] : undefined;
  const resolverAddress = network?.contracts.projectResolver;
  const rpcUrl = getRPCUrlByChainId(project.chainID);

  // If we can't reach the resolver (chain not in Networks, or RPC missing),
  // we can't confirm admins on-chain. Still label the Owner from the indexer
  // so the Team panel doesn't render every member as an unlabelled "Member" —
  // that misleads users about who created the project. Other members fall
  // through with no label (better than guessing "Admin" without on-chain data).
  if (!resolverAddress || !rpcUrl) {
    if (indexerOwner) roles[indexerOwner] = "Owner";
    return roles;
  }

  const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
  const resolver = new ethers.Contract(resolverAddress, PROJECT_RESOLVER_ABI, rpcProvider);

  // Resolve the single Owner from the on-chain mapping, falling back to the
  // indexer's `project.owner` if the resolver returns the zero address (rare;
  // pre-migration attestations may not have the mapping populated).
  let ownerAddress: string | undefined;
  try {
    const onChainOwner: string = await resolver.projectOwner(project.uid);
    if (onChainOwner && onChainOwner.toLowerCase() !== ZERO_ADDRESS) {
      ownerAddress = onChainOwner.toLowerCase();
    }
  } catch {
    // Network failure → leave ownerAddress undefined; we'll fall back below
  }
  if (!ownerAddress && indexerOwner) {
    ownerAddress = indexerOwner;
  }

  const uniqueAddresses = Array.from(
    new Set([...(ownerAddress ? [ownerAddress] : []), ...memberAddresses]),
  );

  await Promise.all(
    uniqueAddresses.map(async (addr) => {
      if (addr === ownerAddress) {
        roles[addr] = "Owner";
        return;
      }
      try {
        const isAdmin: boolean = await resolver.projectAdmins(project.uid, addr);
        roles[addr] = isAdmin ? "Admin" : "Member";
      } catch {
        roles[addr] = "Member";
      }
    }),
  );

  return roles;
};
