import type { Signer } from "ethers";
import type { Chain } from "viem";

/**
 * Supported gasless provider types.
 * Add new providers here as the system expands.
 */
export type GaslessProviderType = "zerodev" | "alchemy";

/**
 * EIP-7702 authorization parameters.
 */
export interface EIP7702AuthorizationParams {
  contractAddress?: `0x${string}`;
  address?: `0x${string}`;
  chainId?: number;
  nonce?: number;
}

/**
 * EIP-7702 authorization result.
 */
export interface EIP7702AuthorizationResult {
  contractAddress: `0x${string}`;
  address: `0x${string}`;
  chainId: number;
  nonce: number;
  r: `0x${string}`;
  s: `0x${string}`;
  v: bigint;
  yParity: number;
}

/**
 * Local account interface with EIP-7702 signAuthorization support.
 * This is a custom type that matches what Privy embedded wallets provide
 * and what ZeroDev/Alchemy expect for EIP-7702 operations.
 *
 * Note: We don't extend viem's LocalAccount directly to avoid type conflicts
 * with the signAuthorization signature.
 */
export interface LocalAccountWithEIP7702 {
  address: `0x${string}`;
  type: "local";
  publicKey?: `0x${string}`;
  source?: string;

  /** Sign a raw hash */
  sign?: (params: { hash: `0x${string}` }) => Promise<`0x${string}`>;

  /** Sign a message (personal_sign) */
  signMessage: (params: {
    message: string | { raw: Uint8Array | `0x${string}` };
  }) => Promise<`0x${string}`>;

  /** Sign EIP-712 typed data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTypedData: (typedData: any) => Promise<`0x${string}`>;

  /** Sign a transaction (not used by smart accounts) */
  signTransaction?: () => Promise<`0x${string}`>;

  /** EIP-7702 authorization signing */
  signAuthorization?: (params: EIP7702AuthorizationParams) => Promise<EIP7702AuthorizationResult>;
}

/**
 * Alchemy-specific configuration for a chain.
 */
export interface AlchemyProviderConfig {
  /** Gas Manager Policy ID for sponsored transactions */
  policyId: string;
}

/**
 * ZeroDev-specific configuration for a chain.
 */
export interface ZeroDevProviderConfig {
  /** ZeroDev project ID */
  projectId: string;
  /** Whether to use EIP-7702 (requires Kernel v0.3.3+) */
  useEIP7702: boolean;
}

/**
 * Configuration for gasless transactions on a specific chain.
 */
export interface ChainGaslessConfig {
  /** Which provider handles this chain */
  provider: GaslessProviderType;
  /** Viem chain definition */
  chain: Chain;
  /** RPC URL for public client operations */
  rpcUrl: string;
  /** Whether gasless is enabled for this chain */
  enabled: boolean;
  /** Alchemy-specific config (required if provider is 'alchemy') */
  alchemy?: AlchemyProviderConfig;
  /** ZeroDev-specific config (required if provider is 'zerodev') */
  zerodev?: ZeroDevProviderConfig;
}

/**
 * Generic smart account client type.
 * Both ZeroDev and Alchemy return different client types,
 * but they share similar transaction sending capabilities.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SmartAccountClient = any;

/**
 * Parameters for creating a gasless client.
 */
export interface CreateClientParams {
  /** Target chain ID */
  chainId: number;
  /** Signer with EIP-7702 support */
  signer: LocalAccountWithEIP7702;
  /** Chain-specific gasless configuration */
  config: ChainGaslessConfig;
}

/**
 * Interface that all gasless providers must implement.
 * This enables the Strategy Pattern for provider selection.
 */
export interface IGaslessProvider {
  /** Provider identifier */
  readonly name: GaslessProviderType;

  /**
   * Creates a smart account client for gasless transactions.
   * @returns Smart account client or null if creation fails
   */
  createClient(params: CreateClientParams): Promise<SmartAccountClient | null>;

  /**
   * Converts the smart account client to an ethers.js Signer.
   * Required for compatibility with the GAP SDK which uses ethers.
   */
  toEthersSigner(
    client: SmartAccountClient,
    chainId: number,
    config: ChainGaslessConfig
  ): Promise<Signer>;
}

/**
 * Custom error for gasless provider failures.
 */
export class GaslessProviderError extends Error {
  constructor(
    message: string,
    public provider: GaslessProviderType,
    public chainId: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "GaslessProviderError";
  }
}
