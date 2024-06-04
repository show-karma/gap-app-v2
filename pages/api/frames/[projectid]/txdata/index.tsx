import { Abi, encodeFunctionData } from "viem";

import { frames } from "../frame";
import { Dontaion_ABI } from "./contracts/Donation";
import { transaction } from "frames.js/core";

import { Networks } from "@show-karma/karma-gap-sdk";

import { ethers } from "ethers";

export const handleRequest = frames(async (ctx) => {
  console.log(ctx.message?.inputText);
  const EtherToWei = ethers.parseUnits(
    ctx.message?.inputText as string,
    "ether"
  );
  console.log(EtherToWei.toString());
  const schema = Networks["optimism-sepolia"].schemas.Details || "0x00000000";
  const recipient = ctx.searchParams["recipient"] || "0x00000000";
  const refuid = ctx.searchParams["refuid"] || "0x00000000";

  if (!ctx?.message) {
    throw new Error("Invalid frame message");
  }

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
        recipient: recipient as `0x${string}`,
        expirationTime: BigInt(0),
        revocable: true,
        refUID: refuid as `0x${string}`,
        data: "0x2125125" as `0x${string}`,
        value: BigInt(0),
      },
    },
    BigInt(EtherToWei),
    // BigInt(100000000),
  ];

  const calldata = encodeFunctionData({
    abi: Dontaion_ABI,
    functionName: "donate",
    args: args,
  });

  return transaction({
    chainId: "eip155:10",
    method: "eth_sendTransaction",
    params: {
      abi: Dontaion_ABI as Abi,
      to: "0x8E232482417FfE40b5E68Bd9e436C2F2c3A97670",
      data: calldata,
      value: BigInt(100000000).toString(),
    },
  });
});

export default handleRequest;
