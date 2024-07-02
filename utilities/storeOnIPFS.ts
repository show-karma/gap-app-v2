import { envVars } from "./enviromentVars";

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
  const IpfsHash = await storeJSON(data);
  return IpfsHash;
}

export async function storeJSON(
  data: any,
  pinataMetadata = { name: "Karma GAP" }
) {
  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${envVars.IPFS_TOKEN}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: pinataMetadata,
      }),
    });
    const resData = await res.json();
    console.log(resData);
    return resData.IpfsHash;
  } catch (error) {
    console.log(error);
  }
}

export async function storeFile(file: File, pinataMetadata = { name: "File" }) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
    formData.append(
      "pinataOptions",
      JSON.stringify({
        cidVersion: 0,
      })
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${envVars.IPFS_TOKEN}`,
      },
      body: formData,
    });
    const resData = await res.json();
    console.log(resData);
    return resData.IpfsHash;
  } catch (error) {
    console.log(error);
  }
}
