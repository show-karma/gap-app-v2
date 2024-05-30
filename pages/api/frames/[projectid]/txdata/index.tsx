import {
  Abi,
  createPublicClient,
  encodeFunctionData,
  getContract,
  http,
} from "viem";

import { frames } from "../frame";
import { Dontaion_ABI } from "./contracts/Donation";
import { transaction } from "frames.js/core";
import { getGapClient } from "@/hooks";

const handleRequest = frames(async (ctx) => {
  const projectId = ctx.request.url.split("/").pop();
  console.log(projectId);
  // const gap = getGapClient(11155420);
  // console.log(gap.findSchema("ProjectEndorsement").uid);
  // const schema = gap.findSchema("ProjectEndorsement").uid;
  const schema =
    "0xd193e75f420a69910f98fa79cacdfd9d0dcbf5933edce8f8bde9a10bd204d996";

  if (!ctx?.message) {
    throw new Error("Invalid frame message");
  }

  // Get current storage price
  const args: readonly [
    {
      schema: `0x${string}`;
      data: {
        recipient: `0x${string}`;
        expirationTime: bigint;
        revocable: boolean;
        refUID: `0x${string}`;
        data: `0x${string}`;
        value: bigint;
      };
    },
    bigint
  ] = [
    {
      schema: schema as `0x${string}`,
      data: {
        recipient:
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
        expirationTime: BigInt(0),
        revocable: true,
        refUID:
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        data: "0x21342" as `0x${string}`,
        value: BigInt(0),
      },
    },
    BigInt(1000000),
  ];

  const calldata = encodeFunctionData({
    abi: Dontaion_ABI,
    functionName: "donate",
    args: args,
  });

  return transaction({
    chainId: "eip155:10", // OP Mainnet 10
    method: "eth_sendTransaction",
    params: {
      abi: Dontaion_ABI as Abi,
      to: "0xf2a0e36141965dbfb7e5e66dfe1a880cc35db12c",
      data: calldata,
      value: BigInt(1000000).toString(),
    },
  });
});

export default handleRequest;
