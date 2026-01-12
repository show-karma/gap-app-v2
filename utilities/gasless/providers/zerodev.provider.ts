import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_3, KernelVersionToAddressesMap } from "@zerodev/sdk/constants";
import { KernelEIP1193Provider } from "@zerodev/sdk/providers";
import { BrowserProvider, type Signer } from "ethers";
import { createPublicClient, http } from "viem";
import type {
  ChainGaslessConfig,
  CreateClientParams,
  IGaslessProvider,
  SmartAccountClient,
} from "../types";
import { GaslessProviderError } from "../types";

/**
 * EntryPoint v0.7 for ERC-4337.
 */
const ENTRYPOINT = getEntryPoint("0.7");

/**
 * Default kernel version for ZeroDev smart accounts.
 */
const KERNEL_VERSION = KERNEL_V3_3;

/**
 * ZeroDev gasless provider implementation.
 * Uses ZeroDev's Kernel smart accounts with EIP-7702 support.
 */
export class ZeroDevProvider implements IGaslessProvider {
  readonly name = "zerodev" as const;

  /**
   * Gets the ZeroDev RPC URL for bundler and paymaster.
   */
  private getRpcUrl(chainId: number, projectId: string): string {
    return `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainId}`;
  }

  /**
   * Gets the kernel implementation address for EIP-7702.
   */
  private getKernelImplementationAddress(): `0x${string}` {
    const kernelAddresses = KernelVersionToAddressesMap[KERNEL_VERSION];
    return kernelAddresses.accountImplementationAddress as `0x${string}`;
  }

  async createClient(params: CreateClientParams): Promise<SmartAccountClient | null> {
    const { chainId, signer, config } = params;

    if (!config.zerodev?.projectId) {
      console.warn(`[ZeroDev] No project ID configured for chain ${chainId}`);
      return null;
    }

    if (!config.rpcUrl) {
      console.warn(`[ZeroDev] No RPC URL configured for chain ${chainId}`);
      return null;
    }

    const zeroDevRpcUrl = this.getRpcUrl(chainId, config.zerodev.projectId);

    try {
      const publicClient = createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl),
      });

      // Check if we should use EIP-7702 (EOA upgraded to smart account)
      if (config.zerodev.useEIP7702 && signer.signAuthorization) {
        return this.createEIP7702Client(params, publicClient, zeroDevRpcUrl);
      }

      // Fallback to regular smart account
      return this.createRegularClient(params, publicClient, zeroDevRpcUrl);
    } catch (error) {
      console.error("[ZeroDev] Failed to create client:", error);
      throw new GaslessProviderError(
        `Failed to create ZeroDev client for chain ${chainId}`,
        "zerodev",
        chainId,
        error
      );
    }
  }

  /**
   * Creates an EIP-7702 kernel client.
   * This upgrades the EOA to a smart account while keeping the SAME address.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createEIP7702Client(
    params: CreateClientParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicClient: any,
    zeroDevRpcUrl: string
  ): Promise<SmartAccountClient | null> {
    const { chainId, signer, config } = params;

    if (!signer.signAuthorization) {
      console.warn("[ZeroDev] Signer does not support EIP-7702 signAuthorization");
      return null;
    }

    const implementationAddress = this.getKernelImplementationAddress();

    // Sign the EIP-7702 authorization
    const authorization = await signer.signAuthorization({
      contractAddress: implementationAddress,
      chainId,
      nonce: 0,
    });

    // Create kernel account with EIP-7702
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelAccount = await createKernelAccount(publicClient, {
      eip7702Account: signer as any,
      eip7702Auth: authorization as any,
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    } as any);

    // Create paymaster client
    const paymasterClient = createZeroDevPaymasterClient({
      chain: config.chain,
      transport: http(zeroDevRpcUrl),
    });

    // Create kernel account client with paymaster
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: config.chain,
      paymaster: paymasterClient,
      bundlerTransport: http(zeroDevRpcUrl),
    });

    return kernelClient;
  }

  /**
   * Creates a regular kernel client (smart account with different address).
   * Used when EIP-7702 is not supported or not desired.
   */
  private async createRegularClient(
    params: CreateClientParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicClient: any,
    zeroDevRpcUrl: string
  ): Promise<SmartAccountClient | null> {
    const { signer, config } = params;

    // Create ECDSA validator from the signer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: signer as any,
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    });

    // Create kernel account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: ENTRYPOINT,
      kernelVersion: KERNEL_VERSION,
    } as any);

    // Create paymaster client
    const paymasterClient = createZeroDevPaymasterClient({
      chain: config.chain,
      transport: http(zeroDevRpcUrl),
    });

    // Create kernel account client with paymaster
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: config.chain,
      paymaster: paymasterClient,
      bundlerTransport: http(zeroDevRpcUrl),
    });

    return kernelClient;
  }

  async toEthersSigner(
    client: SmartAccountClient,
    chainId: number,
    _config: ChainGaslessConfig
  ): Promise<Signer> {
    // Create EIP-1193 provider from kernel client
    const kernelProvider = new KernelEIP1193Provider(client);

    // Wrap in ethers BrowserProvider
    const ethersProvider = new BrowserProvider(kernelProvider);

    // Get signer from provider
    const signer = await ethersProvider.getSigner();

    // Validate the bundler
    await this.validateBundler(client, chainId);

    return signer;
  }

  /**
   * Validates that the bundler is properly supporting the chain.
   */
  private async validateBundler(client: SmartAccountClient, chainId: number): Promise<void> {
    try {
      const supportedEntryPoints = await client.getSupportedEntryPoints();

      if (!supportedEntryPoints || supportedEntryPoints.length === 0) {
        throw new GaslessProviderError(
          `Bundler returned no supported entry points for chain ${chainId}`,
          "zerodev",
          chainId
        );
      }
    } catch (error) {
      if (error instanceof GaslessProviderError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("internal error") ||
        errorMessage.includes("Internal error") ||
        errorMessage.includes("not supported")
      ) {
        throw new GaslessProviderError(
          `Bundler does not properly support chain ${chainId}: ${errorMessage}`,
          "zerodev",
          chainId,
          error
        );
      }
      // For other errors, don't fail - let the transaction attempt proceed
    }
  }
}
