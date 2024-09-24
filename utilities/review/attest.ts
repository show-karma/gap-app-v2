import { getWalletClient } from "@wagmi/core";
import { config } from "@/utilities/wagmi/config";
import {
  createPublicClient,
  encodeFunctionData,
  Hex,
  http,
  WalletClient,
  type TransactionReceipt,
} from "viem";
import { sendTransaction, waitForTransactionReceipt } from "viem/actions";
import { arbitrum } from "viem/chains";
import { ARB_ONE_EAS } from "./constants/constants";

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
  chain: arbitrum,
  transport: http(),
});

export async function submitAttest(
  from: Hex,
  schemaUID: Hex,
  recipient: Hex,
  expirationTime: bigint,
  revocable: boolean,
  refUID: Hex,
  data: Hex,
): Promise<TransactionReceipt | Error> {
  const walletClient = await getWalletClient(config);

  const attestationRequestData: AttestationRequestData = {
    recipient: recipient,
    expirationTime: expirationTime,
    revocable: revocable,
    refUID: refUID,
    data: data,
    value: BigInt(0),
  };

  const AttestationRequest: AttestationRequest = {
    schema: schemaUID,
    data: attestationRequestData,
  };

  const encodedData = encodeFunctionData({
    abi: [
      {
        inputs: [
          {
            components: [
              { internalType: "bytes32", name: "schema", type: "bytes32" },
              {
                components: [
                  { internalType: "address", name: "recipient", type: "address" },
                  { internalType: "uint64", name: "expirationTime", type: "uint64" },
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
    const transactionHash = await sendTransaction(walletClient, {
      /**
       * 10 million gas units is a lot, but based on the gas units
       * used in the attest function, it is enough for all transactions.
       */
      gas: BigInt(10_000_000),
      value: BigInt(0),
      account: from,
      to: ARB_ONE_EAS,
      data: encodedData,
      chain: walletClient.chain,
    });

    const transactionReceipt: TransactionReceipt = await waitForTransactionReceipt(publicClient, {
      hash: transactionHash,
    });

    return transactionReceipt;
  } catch (error) {
    console.error(error);
    return Error(`Error sending transaction. ${error}`);
  }
}
