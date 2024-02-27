import { Project } from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";

export const transferOwnership = async (
  project: Project,
  newOwner: Hex,
  signer: any
) => {
  try {
    await project.transferOwnership(signer, newOwner);
  } catch (error: any) {
    console.log(error);
    throw new Error("Failed to transfer ownership");
  }
};
