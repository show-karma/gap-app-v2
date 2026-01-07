import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, celoMainnet } from "@account-kit/infra";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { BrowserProvider, type Signer } from "ethers";
import type { Chain } from "viem";
import { celo } from "viem/chains";
import type {
  ChainGaslessConfig,
  CreateClientParams,
  IGaslessProvider,
  LocalAccountWithEIP7702,
  SmartAccountClient,
} from "../types";
import { GaslessProviderError } from "../types";

/**
 * Maps viem chain IDs to Alchemy Account Kit chain definitions.
 * Alchemy requires their specific chain objects for proper RPC integration.
 */
const ALCHEMY_CHAIN_MAP: Record<number, Chain> = {
  [celo.id]: celoMainnet,
};

/**
 * Alchemy gasless provider implementation.
 * Uses Alchemy's Modular Account V2 with EIP-7702 support.
 */
export class AlchemyProvider implements IGaslessProvider {
  readonly name = "alchemy" as const;

  /**
   * Gets the Alchemy chain definition for a given chain ID.
   * Alchemy Account Kit requires their specific chain objects.
   */
  private getAlchemyChain(chainId: number): Chain | null {
    return ALCHEMY_CHAIN_MAP[chainId] || null;
  }

  async createClient(params: CreateClientParams): Promise<SmartAccountClient | null> {
    const { chainId, signer, config } = params;

    if (!config.alchemy?.policyId) {
      console.warn(`[Alchemy] No policy ID configured for chain ${chainId}`);
      return null;
    }

    if (!config.rpcUrl) {
      console.warn(`[Alchemy] No RPC URL configured for chain ${chainId}`);
      return null;
    }

    const alchemyChain = this.getAlchemyChain(chainId);
    if (!alchemyChain) {
      console.warn(`[Alchemy] Chain ${chainId} not mapped to Alchemy chain definition`);
      return null;
    }

    if (!signer.signAuthorization) {
      console.warn("[Alchemy] Signer does not support EIP-7702 signAuthorization");
      return null;
    }

    try {
      console.log("[Alchemy] Creating EIP-7702 Modular Account V2 client for chain:", chainId);

      // Create Alchemy signer from the Privy LocalAccount
      // Cast to 'any' because LocalAccountSigner expects viem's LocalAccount type,
      // but our LocalAccountWithEIP7702 is compatible at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alchemySigner = new LocalAccountSigner(signer as any);

      // Create Modular Account V2 client with EIP-7702 mode
      const smartAccountClient = await createModularAccountV2Client({
        mode: "7702",
        transport: alchemy({ rpcUrl: config.rpcUrl }),
        chain: alchemyChain,
        signer: alchemySigner,
        policyId: config.alchemy.policyId,
      });

      console.log("[Alchemy] Smart account client created successfully");
      console.log("[Alchemy] Account address:", smartAccountClient.account?.address);

      return smartAccountClient;
    } catch (error) {
      console.error("[Alchemy] Failed to create client:", error);
      throw new GaslessProviderError(
        `Failed to create Alchemy client for chain ${chainId}`,
        "alchemy",
        chainId,
        error
      );
    }
  }

  async toEthersSigner(
    client: SmartAccountClient,
    chainId: number,
    config: ChainGaslessConfig
  ): Promise<Signer> {
    if (!config.rpcUrl) {
      throw new GaslessProviderError(
        `No RPC URL configured for chain ${chainId}`,
        "alchemy",
        chainId
      );
    }

    // Create a custom EIP-1193 provider that routes calls appropriately
    const customProvider = this.createEIP1193Provider(client, chainId, config.rpcUrl);

    // Wrap in ethers BrowserProvider
    const ethersProvider = new BrowserProvider(customProvider);

    // Get signer from provider
    return ethersProvider.getSigner();
  }

  /**
   * Creates an EIP-1193 compatible provider that routes transaction calls
   * through the Alchemy smart account client.
   */
  private createEIP1193Provider(client: SmartAccountClient, chainId: number, rpcUrl: string) {
    return {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        // Route transaction-related calls through the smart account client
        if (method === "eth_sendTransaction") {
          const tx = (params as Array<{ to: string; data: string; value?: string }>)[0];
          console.log("[Alchemy] Sending transaction via smart account client:", {
            to: tx.to,
            dataLength: tx.data?.length || 0,
            value: tx.value,
          });

          try {
            // Alchemy uses sendUserOperation for smart account transactions
            const result = await client.sendUserOperation({
              uo: {
                target: tx.to as `0x${string}`,
                data: (tx.data || "0x") as `0x${string}`,
                value: tx.value ? BigInt(tx.value) : 0n,
              },
            });

            // Wait for the user operation to be included
            const txHash = await client.waitForUserOperationTransaction(result);
            console.log("[Alchemy] Transaction successful:", txHash);
            return txHash;
          } catch (txError) {
            console.error("[Alchemy] Transaction failed:", txError);
            throw txError;
          }
        }

        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          const account = client.account;
          return account ? [account.address] : [];
        }

        if (method === "eth_chainId") {
          return `0x${chainId.toString(16)}`;
        }

        // Route all other calls to the public RPC
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params: params || [],
          }),
        });

        const json = await response.json();
        if (json.error) {
          throw new Error(json.error.message);
        }
        return json.result;
      },
    };
  }
}
