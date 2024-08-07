import { getWalletClient } from "@wagmi/core";
import {
  createPublicClient,
  encodeFunctionData,
  Hex,
  http,
  type TransactionReceipt,
} from "viem";
import {
  sendTransaction,
  estimateGas,
  waitForTransactionReceipt,
} from "viem/actions";

import { EAS_CONTRACT_OP } from "../client/constants"; //Create the constant file? where to createit?

import { config } from "@/utilities/wagmi/config";
import { mainnet } from "viem/chains";

export interface AttestationRequestData {
  recipient: Hex;
  expirationTime: bigint;
  revocable: boolean;
  refUID: Hex;
  data: Hex;
  value: bigint;
}

export interface AttestationRequest {
  schema: Hex;
  data: AttestationRequestData;
}

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export async function submitAttest(
  from: Hex,
  schemaUID: Hex,
  attestationRequestData: AttestationRequestData
): Promise<TransactionReceipt | Error> {
  const walletClient = await getWalletClient(config);
  let gasLimit;

  const AttestationRequest: AttestationRequest = {
    schema: schemaUID,
    data: attestationRequestData,
  };

  const data = encodeFunctionData({
    abi: [
      {
        inputs: [
          {
            components: [
              { internalType: "bytes32", name: "schema", type: "bytes32" },
              {
                components: [
                  {
                    internalType: "address",
                    name: "recipient",
                    type: "address",
                  },
                  {
                    internalType: "uint64",
                    name: "expirationTime",
                    type: "uint64",
                  },
                  { internalType: "bool", name: "revocable", type: "bool" },
                  { internalType: "bytes32", name: "refUID", type: "bytes32" },
                  { internalType: "bytes", name: "data", type: "bytes" },
                  { internalType: "uint256", name: "value", type: "uint256" },
                ],
                internalType: "struct AttestationRequestData",
                name: "data",
                type: "tuple",
              },
            ],
            internalType: "struct AttestationRequest",
            name: "request",
            type: "tuple",
          },
        ],
        name: "attest",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "payable",
        type: "function",
      },
    ],

    args: [AttestationRequest],
  });

  try {
    gasLimit = await estimateGas(publicClient, {
      account: from as Hex,
      to: EAS_CONTRACT_OP as Hex,
      data: data,
      value: attestationRequestData.value,
    });
  } catch (error) {
    return Error("Error estimating gas.");
  }

  try {
    const transactionHash = await sendTransaction(walletClient, {
      account: from as Hex,
      to: EAS_CONTRACT_OP as Hex,
      gasLimit: gasLimit,
      data: data,
      value: attestationRequestData.value,
      chain: walletClient.chain,
    });

    const transactionReceipt: TransactionReceipt =
      await waitForTransactionReceipt(publicClient, {
        hash: transactionHash,
      });

    return transactionReceipt;
  } catch (error) {
    return Error("Error sending transaction.");
  }
}
