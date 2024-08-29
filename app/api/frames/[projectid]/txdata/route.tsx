import { Abi, encodeFunctionData } from "viem";
import { transaction } from "frames.js/core";
import { Networks } from "@show-karma/karma-gap-sdk";
import { ethers } from "ethers";
import { getChainNameById } from "@/utilities/network";
import { DonationsABI } from "../../../../../utilities/donations/abi";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { frames } from "@/utilities/frames";

const handleRequest = frames(async (ctx) => {
  const EtherToWei = ethers.parseUnits(
    ctx.message?.inputText as string,
    "ether"
  );
  const chainId = ctx.searchParams["chainID"] || "0x00000000";
  const schema =
    Networks[getChainNameById(parseInt(chainId))].schemas.Details ||
    "0x00000000";
  const recipient = ctx.searchParams["recipient"] || "0x00000000";
  const refuid = ctx.searchParams["refuid"] || "0x00000000";

  const schemaEncoder = new SchemaEncoder("string json");
  const encodedData = schemaEncoder.encodeData([
    {
      name: "json",
      value: JSON.stringify({
        comment: `Donation to project ${ctx.message?.inputText}`,
        type: "project-endorsement",
      }),
      type: "string",
    },
  ]);

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
        data: string;
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
        data: encodedData,
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
      value: BigInt(EtherToWei).toString(),
    },
  });
});

export const GET = handleRequest;
export const POST = handleRequest;
