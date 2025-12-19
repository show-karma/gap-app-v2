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
  type LocalAccount,
  createPublicClient,
  http,
  type WalletClient,
  toHex,
  type SignableMessage,
} from "viem";
import { envVars } from "../enviromentVars";
import { ENTRYPOINT, getZeroDevConfig, isChainSupportedForGasless, KERNEL_VERSION } from "./config";

// Use simple type for kernel client to avoid complex ZeroDev SDK type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KernelClient = any;

interface CreateKernelSignerOptions {
  chainId: number;
  signer: Account;
}

/**
 * Creates a ZeroDev-compatible signer from a Privy embedded wallet.
 * This wraps the Privy wallet's signing functions to properly handle
 * the raw bytes format that ZeroDev uses for user operation signing.
 */
export async function createPrivySignerForZeroDev(
  embeddedWallet: {
    address: string;
    switchChain: (chainId: number) => Promise<void>;
    getEthereumProvider: () => Promise<any>;
  },
  chainId: number
): Promise<LocalAccount> {
  const provider = await embeddedWallet.getEthereumProvider();

  const address = embeddedWallet.address as `0x${string}`;

  // Create a LocalAccount that properly handles signMessage with raw bytes
  const account: LocalAccount = {
    address,
    type: "local",
    publicKey: "0x" as `0x${string}`, // Not used by ZeroDev
    source: "custom",

    // Sign message - handles both string and raw bytes formats
    signMessage: async ({ message }: { message: SignableMessage }): Promise<`0x${string}`> => {
      console.log("[ZeroDev] signMessage called with:", typeof message, message);

      let messageToSign: string;

      // Handle different message formats
      if (typeof message === "string") {
        messageToSign = message;
      } else if (message && typeof message === "object" && "raw" in message) {
        // ZeroDev passes { raw: Uint8Array | Hex } for user operation hashes
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

      // Use personal_sign with the raw hash
      // Note: personal_sign expects hex-encoded data for raw bytes
      const signature = await provider.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });

      console.log("[ZeroDev] Signature received:", signature);
      return signature as `0x${string}`;
    },

    // Sign typed data - not typically needed for basic kernel operations
    signTypedData: async (typedData: any): Promise<`0x${string}`> => {
      console.log("[ZeroDev] signTypedData called");
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      });
      return signature as `0x${string}`;
    },

    // Sign transaction - not used by ZeroDev (it uses user operations)
    signTransaction: async (): Promise<`0x${string}`> => {
      throw new Error("signTransaction not supported - use user operations");
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
    const kernelAccount = await createKernelAccount(publicClient as any, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    } as any);

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
 * Creates a ZeroDev kernel account client for an EIP-7702 upgraded EOA.
 * This is used for MetaMask users who have enabled smart account mode.
 *
 * @returns Kernel account client that preserves the original EOA address
 */
export async function createKernelClientFor7702({
  chainId,
  walletClient,
  authorization,
}: CreateKernel7702SignerOptions): Promise<KernelClient | null> {
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

  if (!walletClient.account) {
    console.warn("[ZeroDev] Wallet client has no account");
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    // Create kernel account with EIP-7702 authorization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelAccount = await createKernelAccount(publicClient as any, {
      eip7702Account: walletClient.account as any,
      eip7702Auth: authorization as any,
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    } as any);

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

    return kernelClient as KernelClient;
  } catch (error) {
    console.error("[ZeroDev] Failed to create 7702 kernel client:", error);
    return null;
  }
}

/**
 * Converts a ZeroDev kernel client to an ethers.js Signer.
 * This bridges ZeroDev's viem-based client with the GAP SDK's ethers-based requirements.
 *
 * @param kernelClient - The kernel account client from ZeroDev
 * @returns An ethers.js Signer that routes transactions through the kernel account
 */
export async function kernelClientToEthersSigner(
  kernelClient: KernelClient
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

  return signer;
}

/**
 * Re-export for convenience
 */
export { isChainSupportedForGasless };
