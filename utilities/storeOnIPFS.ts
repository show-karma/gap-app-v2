import { envVars } from "./enviromentVars";
import { NFTStorage } from "nft.storage";

export type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number }[];
};
export type ContractMetadata = {
  name: string;
  description: string;
  image: string;
};

export async function storeMetadata(data: TokenMetadata | ContractMetadata) {
  const ipfsStorage = new NFTStorage({
    token: envVars.IPFS_TOKEN,
  });

  const cid = await ipfsStorage.storeBlob(new Blob([JSON.stringify(data)]));
  return cid;
}

export async function storeJSON(data: any) {
  const ipfsStorage = new NFTStorage({
    token: envVars.IPFS_TOKEN,
  });

  const cid = await ipfsStorage.storeBlob(new Blob([JSON.stringify(data)]));
  return cid;
}

export async function storeFile(file: File) {
  const ipfsStorage = new NFTStorage({
    token: envVars.IPFS_TOKEN,
  });

  const cid = await ipfsStorage.storeBlob(file);
  return cid;
}
