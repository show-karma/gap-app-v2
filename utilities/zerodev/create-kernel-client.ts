import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { KernelEIP1193Provider } from "@zerodev/sdk/providers";
import { BrowserProvider, type Signer } from "ethers";
import {
  type Account,
  concatHex,
  createPublicClient,
  type Hex,
  http,
  keccak256,
  type LocalAccount,
  numberToHex,
  type SignableMessage,
  toHex,
  toRlp,
  type WalletClient,
} from "viem";
import { envVars } from "../enviromentVars";
import {
  ENTRYPOINT,
  getKernelImplementationAddress,
  getZeroDevConfig,
  isChainSupportedForGasless,
  KERNEL_VERSION,
} from "./config";

// Use simple type for kernel client to avoid complex ZeroDev SDK type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KernelClient = any;

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

interface CreateKernelSignerOptions {
  chainId: number;
  signer: Account;
}

// LocalAccount with EIP-7702 signAuthorization support
type LocalAccountWithEIP7702 = LocalAccount & {
  signAuthorization?: (authorization: {
    contractAddress: `0x${string}`;
    chainId: number;
    nonce?: number;
  }) => Promise<{
    contractAddress: `0x${string}`;
    chainId: number;
    nonce: number;
    r: `0x${string}`;
    s: `0x${string}`;
    yParity: number;
  }>;
};

/**
 * Creates a ZeroDev-compatible signer from a Privy embedded wallet.
 * This wraps the Privy wallet's signing functions to properly handle
 * the raw bytes format that ZeroDev uses for user operation signing,
 * and includes EIP-7702 signAuthorization support.
 */
export async function createPrivySignerForZeroDev(
  embeddedWallet: {
    address: string;
    switchChain: (chainId: number) => Promise<void>;
    getEthereumProvider: () => Promise<any>;
    walletClientType?: string;
  },
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

    // Raw hash signing - required for EIP-7702
    sign: async ({ hash }: { hash: `0x${string}` }): Promise<`0x${string}`> => {
      console.log("[ZeroDev] sign (raw) called with hash:", hash);
      if (!isPrivyEmbedded) {
        throw new Error("Raw signing is only supported for Privy embedded wallets");
      }
      const signature = await provider.request({
        method: "secp256k1_sign",
        params: [hash],
      });
      console.log("[ZeroDev] Raw signature received:", signature);
      return signature as `0x${string}`;
    },

    // Sign message - handles both string and raw bytes formats
    signMessage: async ({ message }: { message: SignableMessage }): Promise<`0x${string}`> => {
      console.log("[ZeroDev] signMessage called with:", typeof message, message);

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

      console.log("[ZeroDev] Signing message:", messageToSign);

      const signature = await provider.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });

      console.log("[ZeroDev] Signature received:", signature);
      return signature as `0x${string}`;
    },

    // Sign typed data
    signTypedData: async (typedData: any): Promise<`0x${string}`> => {
      console.log("[ZeroDev] signTypedData called");
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      });
      return signature as `0x${string}`;
    },

    // Sign transaction - not used by ZeroDev
    signTransaction: async (): Promise<`0x${string}`> => {
      throw new Error("signTransaction not supported - use user operations");
    },

    // EIP-7702 authorization signing
    signAuthorization: async (authorization: {
      contractAddress?: `0x${string}`;
      address?: `0x${string}`;
      chainId?: number;
      nonce?: number;
    }): Promise<{
      contractAddress: `0x${string}`;
      address: `0x${string}`;
      chainId: number;
      nonce: number;
      r: `0x${string}`;
      s: `0x${string}`;
      v: bigint;
      yParity: number;
    }> => {
      // Get target address, defaulting to kernel implementation
      const targetAddress: `0x${string}` =
        authorization.contractAddress || authorization.address || getKernelImplementationAddress();

      if (!authorization.contractAddress && !authorization.address) {
        console.log("[ZeroDev] No address provided, using kernel implementation:", targetAddress);
      }

      const authChainId = authorization.chainId ?? chainId;
      const authNonce = authorization.nonce ?? 0;

      console.log("[ZeroDev] signAuthorization called:", {
        targetAddress,
        chainId: authChainId,
        nonce: authNonce,
        signerAddress: address,
      });

      if (!isPrivyEmbedded) {
        throw new Error("EIP-7702 signAuthorization is only supported for Privy embedded wallets");
      }

      const hash = hashAuthorization({
        contractAddress: targetAddress,
        chainId: authChainId,
        nonce: authNonce,
      });

      console.log("[ZeroDev] Authorization hash:", hash);

      const signature = (await provider.request({
        method: "secp256k1_sign",
        params: [hash],
      })) as string;

      console.log("[ZeroDev] Authorization signature:", signature);

      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const vRaw = parseInt(signature.slice(130, 132), 16);
      const yParity = vRaw >= 27 ? vRaw - 27 : vRaw;
      const v = BigInt(yParity + 27);

      console.log("[ZeroDev] Authorization parsed:", { r, s, yParity, v: v.toString() });

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

interface CreateKernel7702SignerOptions {
  chainId: number;
  walletClient: WalletClient;
  authorization: {
    contractAddress: `0x${string}`;
    chainId: number;
    nonce?: number;
    r: `0x${string}`;
    s: `0x${string}`;
    yParity: number;
  };
}

/**
 * Get RPC URL for a chain from environment variables.
 */
function getRpcUrl(chainId: number): string | null {
  // Map chainId to RPC URL
  const chainIdToRpc: Record<number, string | undefined> = {
    1: envVars.RPC.MAINNET,
    10: envVars.RPC.OPTIMISM,
    42161: envVars.RPC.ARBITRUM,
    8453: envVars.RPC.BASE,
    42220: envVars.RPC.CELO,
    137: envVars.RPC.POLYGON,
    11155420: envVars.RPC.OPT_SEPOLIA,
    84532: envVars.RPC.BASE_SEPOLIA,
    11155111: envVars.RPC.SEPOLIA,
    1329: envVars.RPC.SEI,
    1135: envVars.RPC.LISK,
    534352: envVars.RPC.SCROLL,
  };
  return chainIdToRpc[chainId] || null;
}

/**
 * Creates a ZeroDev kernel account client for an embedded wallet signer.
 * This is used for email/Google/passkey users.
 *
 * @returns Kernel account client that can be used for gasless transactions
 */
export async function createKernelClientForEmbeddedWallet({
  chainId,
  signer,
}: CreateKernelSignerOptions): Promise<KernelClient | null> {
  const config = getZeroDevConfig(chainId);
  if (!config) {
    console.warn(`[ZeroDev] Chain ${chainId} not supported for gasless transactions`);
    return null;
  }

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    console.warn(`[ZeroDev] No RPC URL configured for chain ${chainId}`);
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    // Create ECDSA validator from the signer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ecdsaValidator = await signerToEcdsaValidator(publicClient as any, {
      signer: signer as any,
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    });

    // Create kernel account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelAccount = await createKernelAccount(
      publicClient as any,
      {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: ENTRYPOINT,
        kernelVersion: KERNEL_VERSION,
      } as any
    );

    // Create paymaster client
    const paymasterClient = createZeroDevPaymasterClient({
      chain: config.chain,
      transport: http(config.paymasterRpc),
    });

    console.log("[ZeroDev] Creating kernel account client with:", {
      accountAddress: kernelAccount.address,
      chainId: config.chain.id,
      bundlerRpc: config.bundlerRpc,
      paymasterRpc: config.paymasterRpc,
    });

    // Create kernel account client with paymaster
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: config.chain,
      paymaster: paymasterClient,
      bundlerTransport: http(config.bundlerRpc),
    });

    console.log("[ZeroDev] Kernel client created successfully");

    return kernelClient as KernelClient;
  } catch (error) {
    console.error("[ZeroDev] Failed to create kernel client:", error);
    return null;
  }
}

/**
 * Creates a ZeroDev kernel account client using EIP-7702.
 * This upgrades the EOA to a smart account while keeping the SAME address.
 * Works for Privy embedded wallets that support secp256k1_sign.
 *
 * @returns Kernel account client that uses the original EOA address for transactions
 */
export async function createKernelClientWithEIP7702({
  chainId,
  signer,
}: {
  chainId: number;
  signer: LocalAccountWithEIP7702;
}): Promise<KernelClient | null> {
  const config = getZeroDevConfig(chainId);
  if (!config) {
    console.warn(`[ZeroDev] Chain ${chainId} not supported for gasless transactions`);
    return null;
  }

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    console.warn(`[ZeroDev] No RPC URL configured for chain ${chainId}`);
    return null;
  }

  if (!signer.signAuthorization) {
    console.warn("[ZeroDev] Signer does not support EIP-7702 signAuthorization");
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    const implementationAddress = getKernelImplementationAddress();
    console.log("[ZeroDev] Kernel implementation address:", implementationAddress);

    // Sign the EIP-7702 authorization
    console.log("[ZeroDev] Signing EIP-7702 authorization...");
    const authorization = await signer.signAuthorization({
      contractAddress: implementationAddress,
      chainId,
      nonce: 0,
    });
    console.log("[ZeroDev] Authorization signed:", authorization);

    console.log("[ZeroDev] Creating kernel account with EIP-7702...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelAccount = await createKernelAccount(
      publicClient as any,
      {
        eip7702Account: signer as any,
        eip7702Auth: authorization as any,
        entryPoint: ENTRYPOINT,
        kernelVersion: KERNEL_VERSION,
      } as any
    );

    console.log("[ZeroDev] EIP-7702 Kernel account created:", {
      accountAddress: kernelAccount.address,
      signerAddress: signer.address,
      sameAddress: kernelAccount.address === signer.address,
    });

    // Create paymaster client
    const paymasterClient = createZeroDevPaymasterClient({
      chain: config.chain,
      transport: http(config.paymasterRpc),
    });

    // Create kernel account client with paymaster
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: config.chain,
      paymaster: paymasterClient,
      bundlerTransport: http(config.bundlerRpc),
    });

    console.log("[ZeroDev] EIP-7702 Kernel client created successfully");

    return kernelClient as KernelClient;
  } catch (error) {
    console.error("[ZeroDev] Failed to create EIP-7702 kernel client:", error);
    return null;
  }
}

/**
 * Custom error type for bundler validation failures.
 * This error is thrown when the bundler doesn't support the chain properly.
 */
export class BundlerValidationError extends Error {
  constructor(
    message: string,
    public chainId: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "BundlerValidationError";
  }
}

/**
 * Validates that the bundler is properly supporting the chain.
 * Makes a lightweight RPC call to verify the bundler endpoint is working.
 *
 * @param kernelClient - The kernel client to validate
 * @param chainId - The chain ID for error reporting
 * @throws BundlerValidationError if the bundler is not working
 */
async function validateBundler(kernelClient: KernelClient, chainId: number): Promise<void> {
  console.log("[ZeroDev] Validating bundler for chain:", chainId);

  try {
    // Try to get the supported entry points - this is a lightweight RPC call
    // that will fail if the bundler doesn't support this chain
    const supportedEntryPoints = await kernelClient.getSupportedEntryPoints();
    console.log("[ZeroDev] Bundler supports entry points:", supportedEntryPoints);

    if (!supportedEntryPoints || supportedEntryPoints.length === 0) {
      throw new BundlerValidationError(
        `Bundler returned no supported entry points for chain ${chainId}`,
        chainId
      );
    }
  } catch (error) {
    // If we get a specific error about the bundler, wrap it
    if (error instanceof BundlerValidationError) {
      throw error;
    }

    // Check for common bundler error patterns
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("internal error") ||
      errorMessage.includes("Internal error") ||
      errorMessage.includes("not supported") ||
      errorMessage.includes("UserOperationExecutionError")
    ) {
      throw new BundlerValidationError(
        `Bundler does not properly support chain ${chainId}: ${errorMessage}`,
        chainId,
        error
      );
    }

    // For other errors, log but don't fail - let the transaction attempt proceed
    console.warn("[ZeroDev] Bundler validation warning (continuing anyway):", error);
  }
}

/**
 * Converts a ZeroDev kernel client to an ethers.js Signer.
 * This bridges ZeroDev's viem-based client with the GAP SDK's ethers-based requirements.
 *
 * @param kernelClient - The kernel account client from ZeroDev
 * @param options - Optional configuration
 * @param options.chainId - Chain ID for bundler validation (if provided, validates bundler first)
 * @returns An ethers.js Signer that routes transactions through the kernel account
 * @throws BundlerValidationError if bundler validation fails
 */
export async function kernelClientToEthersSigner(
  kernelClient: KernelClient,
  options?: { chainId?: number }
): Promise<Signer> {
  console.log("[ZeroDev] kernelClientToEthersSigner - Creating EIP-1193 provider");
  console.log("[ZeroDev] kernelClient account address:", kernelClient.account?.address);

  // Create EIP-1193 provider from kernel client
  const kernelProvider = new KernelEIP1193Provider(kernelClient);
  console.log("[ZeroDev] KernelEIP1193Provider created");

  // Wrap the provider's request method to add logging
  const originalRequest = kernelProvider.request.bind(kernelProvider);
  kernelProvider.request = async (args: { method: string; params?: unknown[] }) => {
    console.log("[ZeroDev] Provider request:", args.method, args.params);
    try {
      const result = await originalRequest(args);
      console.log("[ZeroDev] Provider response:", args.method, result);
      return result;
    } catch (error: unknown) {
      console.error("[ZeroDev] Provider error for", args.method, ":", error);
      // Re-throw with better error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ZeroDev request failed: ${JSON.stringify(error)}`);
    }
  };

  // Wrap in ethers BrowserProvider
  const ethersProvider = new BrowserProvider(kernelProvider);
  console.log("[ZeroDev] BrowserProvider created");

  // Get signer from provider
  const signer = await ethersProvider.getSigner();
  console.log("[ZeroDev] Signer created, address:", await signer.getAddress());

  // Verify the signer can get network
  try {
    const network = await ethersProvider.getNetwork();
    console.log("[ZeroDev] Signer network:", network.chainId.toString());
  } catch (e) {
    console.warn("[ZeroDev] Could not get network from signer:", e);
  }

  // Validate the bundler if chainId is provided
  // This catches chains where the bundler doesn't work (like Celo via ZeroDev)
  if (options?.chainId) {
    await validateBundler(kernelClient, options.chainId);
  }

  return signer;
}

/**
 * Re-export for convenience
 */
export { isChainSupportedForGasless };
