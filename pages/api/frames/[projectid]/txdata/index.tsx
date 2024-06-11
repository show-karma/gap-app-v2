import { Abi, encodeFunctionData } from "viem";
import { frames } from "../frame";
import { transaction } from "frames.js/core";
import { Networks } from "@show-karma/karma-gap-sdk";
import { ethers } from "ethers";
import { DonationsABI } from "../../../../../utilities/donations/abi";
import { getChainNameById } from "@/utilities/network";

export const handleRequest = frames(async (ctx) => {
  console.log(ctx.message?.inputText);
  const EtherToWei = ethers.parseUnits(
    ctx.message?.inputText as string,
    "ether"
  );
  console.log(EtherToWei.toString());
  const chainId = ctx.searchParams["chainId"] || "0x00000000";
  const schema =
    Networks[getChainNameById(parseInt(chainId))].schemas.Details ||
    "0x00000000";
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
    abi: DonationsABI,
    functionName: "donate",
    args: args,
  });

  return transaction({
    chainId: `eip155:${chainId}`,
    method: "eth_sendTransaction",
    params: {
      abi: DonationsABI as Abi,
      to: Networks[getChainNameById(parseInt(chainId))].contracts.donations,
      data: calldata,
      value: BigInt(100000000).toString(),
    },
  });
});

export default handleRequest;
