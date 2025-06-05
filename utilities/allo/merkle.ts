import { keccak256, encodePacked } from "viem";
import type { Address } from "viem";
import type { ValidatedCSVRow } from "@/types/allo";

export interface MerkleDistribution {
  merkleRoot: `0x${string}`;
  merkleTree: MerkleTree;
  distributions: DistributionEntry[];
}

export interface DistributionEntry {
  index: number;
  recipientId: Address;
  recipientAddress: Address;
  amount: bigint;
  merkleProof: `0x${string}`[];
}

export class MerkleTree {
  private elements: `0x${string}`[];
  private layers: `0x${string}`[][];

  constructor(elements: `0x${string}`[]) {
    this.elements = [...elements];
    this.layers = this.getLayers(this.elements);
  }

  private getLayers(elements: `0x${string}`[]): `0x${string}`[][] {
    if (elements.length === 0) {
      throw new Error('Cannot create merkle tree with no elements');
    }

    const layers: `0x${string}`[][] = [];
    layers.push(elements);

    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1];
      const nextLayer: `0x${string}`[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        nextLayer.push(keccak256(encodePacked(['bytes32', 'bytes32'], [left, right])));
      }

      layers.push(nextLayer);
    }

    return layers;
  }

  getRoot(): `0x${string}` {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): `0x${string}`[] {
    if (index >= this.elements.length) {
      throw new Error('Index out of bounds');
    }

    const proof: `0x${string}`[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const currentLayer = this.layers[i];
      const isRightNode = currentIndex % 2 === 1;
      const pairIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (pairIndex < currentLayer.length) {
        proof.push(currentLayer[pairIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}

/**
 * Generate merkle tree for distribution
 */
export function generateMerkleDistribution(csvData: ValidatedCSVRow[]): MerkleDistribution {
  console.log(`Generating merkle tree for ${csvData.length} recipients`);

  // Create distribution entries
  const distributions: DistributionEntry[] = csvData.map((row, index) => ({
    index,
    recipientId: row.checksummedAddress,
    recipientAddress: row.checksummedAddress,
    amount: row.parsedAmount,
    merkleProof: [] // Will be filled after tree creation
  }));

  // Create leaf nodes for merkle tree
  // Each leaf is a hash of: keccak256(abi.encodePacked(index, recipientId, amount))
  const leaves: `0x${string}`[] = distributions.map((dist) => 
    keccak256(
      encodePacked(
        ['uint256', 'address', 'uint256'],
        [BigInt(dist.index), dist.recipientId, dist.amount]
      )
    )
  );

  console.log('Generated leaves:', leaves);

  // Create merkle tree
  const merkleTree = new MerkleTree(leaves);
  const merkleRoot = merkleTree.getRoot();

  console.log('Merkle root:', merkleRoot);

  // Generate proofs for each distribution
  distributions.forEach((dist, index) => {
    dist.merkleProof = merkleTree.getProof(index);
  });

  return {
    merkleRoot,
    merkleTree,
    distributions,
  };
}

/**
 * Verify a merkle proof
 */
export function verifyMerkleProof(
  proof: `0x${string}`[],
  root: `0x${string}`,
  leaf: `0x${string}`
): boolean {
  let computedHash = leaf;

  for (const proofElement of proof) {
    if (computedHash <= proofElement) {
      computedHash = keccak256(encodePacked(['bytes32', 'bytes32'], [computedHash, proofElement]));
    } else {
      computedHash = keccak256(encodePacked(['bytes32', 'bytes32'], [proofElement, computedHash]));
    }
  }

  return computedHash === root;
} 