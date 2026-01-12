import { concatHex, keccak256, numberToHex, toHex, toRlp } from "viem";
import type {
  EIP7702AuthorizationParams,
  EIP7702AuthorizationResult,
  LocalAccountWithEIP7702,
} from "../types";

/**
 * Hash an EIP-7702 authorization according to the spec.
 * The hash is: keccak256(0x05 || rlp([chainId, contractAddress, nonce]))
 */
function hashAuthorization(authorization: {
  contractAddress: `0x${string}`;
  chainId: number;
  nonce: number;
}): `0x${string}` {
  const { contractAddress, chainId, nonce } = authorization;
  const MAGIC = "0x05" as `0x${string}`;
  const rlpEncoded = toRlp([
    chainId ? numberToHex(chainId) : "0x",
    contractAddress,
    nonce ? numberToHex(nonce) : "0x",
  ]);
  const data = concatHex([MAGIC, rlpEncoded]);
  return keccak256(data);
}

/**
 * Privy embedded wallet interface.
 * Defines the required methods from Privy's wallet for gasless operations.
 */
export interface PrivyEmbeddedWallet {
  address: string;
  switchChain: (chainId: number) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEthereumProvider: () => Promise<any>;
  walletClientType?: string;
}

/**
 * Creates a ZeroDev/Alchemy-compatible signer from a Privy embedded wallet.
 *
 * This wraps the Privy wallet's signing functions to properly handle:
 * - Raw bytes format for user operation signing
 * - EIP-7702 signAuthorization for smart account upgrades
 * - Typed data signing for EIP-712
 *
 * @param embeddedWallet - Privy embedded wallet instance
 * @param chainId - Target chain ID for authorization signing
 * @returns LocalAccount with EIP-7702 signAuthorization support
 */
export async function createPrivySignerForGasless(
  embeddedWallet: PrivyEmbeddedWallet,
  chainId: number
): Promise<LocalAccountWithEIP7702> {
  const provider = await embeddedWallet.getEthereumProvider();
  const address = embeddedWallet.address as `0x${string}`;
  const isPrivyEmbedded = embeddedWallet.walletClientType === "privy";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account: any = {
    address,
    type: "local",
    publicKey: "0x" as `0x${string}`,
    source: "custom",

    /**
     * Raw hash signing - required for EIP-7702.
     * Only supported for Privy embedded wallets.
     */
    sign: async ({ hash }: { hash: `0x${string}` }): Promise<`0x${string}`> => {
      if (!isPrivyEmbedded) {
        throw new Error("Raw signing is only supported for Privy embedded wallets");
      }
      const signature = await provider.request({
        method: "secp256k1_sign",
        params: [hash],
      });
      return signature as `0x${string}`;
    },

    /**
     * Sign message - handles both string and raw bytes formats.
     * Used for personal_sign operations.
     */
    signMessage: async ({
      message,
    }: {
      message: string | { raw: Uint8Array | `0x${string}` };
    }): Promise<`0x${string}`> => {
      let messageToSign: string;

      if (typeof message === "string") {
        messageToSign = message;
      } else if (message && typeof message === "object" && "raw" in message) {
        const raw = message.raw;
        if (raw instanceof Uint8Array) {
          messageToSign = toHex(raw);
        } else {
          messageToSign = raw as string;
        }
      } else {
        messageToSign = String(message);
      }

      const signature = await provider.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });

      return signature as `0x${string}`;
    },

    /**
     * Sign typed data - handles EIP-712 typed data.
     * Properly serializes BigInt values which are common in typed data.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTypedData: async (typedData: any): Promise<`0x${string}`> => {
      // Handle BigInt values which are common in EIP-712 typed data (amounts, timestamps)
      const replacer = (_key: string, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value;
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData, replacer)],
      });
      return signature as `0x${string}`;
    },

    /**
     * Sign transaction - not used by smart account clients.
     * Smart accounts use user operations instead.
     */
    signTransaction: async (): Promise<`0x${string}`> => {
      throw new Error("signTransaction not supported - use user operations");
    },

    /**
     * EIP-7702 authorization signing.
     * Signs the authorization that allows the EOA to delegate to a smart contract.
     * Only supported for Privy embedded wallets.
     *
     * @param authorization - Authorization parameters
     * @param authorization.contractAddress - Target contract address (smart account implementation)
     * @param authorization.chainId - Chain ID for the authorization
     * @param authorization.nonce - Nonce for replay protection
     */
    signAuthorization: async (
      authorization: EIP7702AuthorizationParams
    ): Promise<EIP7702AuthorizationResult> => {
      if (!isPrivyEmbedded) {
        throw new Error("EIP-7702 signAuthorization is only supported for Privy embedded wallets");
      }

      // Get target address from either contractAddress or address field
      const targetAddress: `0x${string}` =
        authorization.contractAddress || authorization.address || ("0x" as `0x${string}`);

      if (!targetAddress || targetAddress === "0x") {
        throw new Error("No target address provided for EIP-7702 authorization");
      }

      const authChainId = authorization.chainId ?? chainId;
      const authNonce = authorization.nonce ?? 0;

      // Hash the authorization data according to EIP-7702 spec
      const hash = hashAuthorization({
        contractAddress: targetAddress,
        chainId: authChainId,
        nonce: authNonce,
      });

      // Sign the hash using Privy's raw signing
      const signature = (await provider.request({
        method: "secp256k1_sign",
        params: [hash],
      })) as string;

      // Parse the signature components
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const vRaw = parseInt(signature.slice(130, 132), 16);
      const yParity = vRaw >= 27 ? vRaw - 27 : vRaw;
      const v = BigInt(yParity + 27);

      return {
        contractAddress: targetAddress,
        address: targetAddress,
        chainId: authChainId,
        nonce: authNonce,
        r,
        s,
        v,
        yParity,
      };
    },
  };

  return account;
}
