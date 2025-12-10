import {
  AbstractSigner,
  Provider,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
} from "ethers";

// Define the minimal interface needed from Privy's smart wallet client
// Using 'any' for the client type since Privy's SmartWalletClient has strict typing
// that doesn't match generic JSON-RPC request patterns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SmartWalletClientInterface = any;

/**
 * A custom ethers Signer that wraps Privy's smart wallet client.
 *
 * This bridges the gap between:
 * - Privy's viem-based smart wallet client
 * - karma-gap-sdk's ethers-based signer requirements
 *
 * When sendTransaction() is called, it routes through Privy's smart wallet
 * which automatically uses the configured paymaster for gas sponsorship.
 */
export class PrivySmartWalletSigner extends AbstractSigner {
  private client: SmartWalletClientInterface;
  private _address: string;
  override readonly provider: Provider;

  /**
   * @param client - Privy smart wallet client from useSmartWallets() hook
   * @param address - The smart wallet address
   * @param provider - An ethers JsonRpcProvider for the target chain
   */
  constructor(
    client: SmartWalletClientInterface,
    address: string,
    provider: Provider
  ) {
    super(provider);
    this.client = client;
    this._address = address;
    this.provider = provider;
  }

  /**
   * Returns the smart wallet address.
   * Required by karma-gap-sdk's GapContract.getSignerAddress()
   */
  async getAddress(): Promise<string> {
    return this._address;
  }

  /**
   * Signs a message using Privy's smart wallet.
   * May be used by some SDK operations.
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    const msg =
      typeof message === "string"
        ? message
        : `0x${Buffer.from(message).toString("hex")}`;
    // Use the client's signMessage method directly
    return this.client.signMessage({
      account: this._address as `0x${string}`,
      message: msg,
    });
  }

  /**
   * Signs EIP-712 typed data.
   * Required by AbstractSigner in ethers v6.
   */
  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    // Remove EIP712Domain from types if present (viem doesn't want it)
    const { EIP712Domain: _removed, ...typesWithoutDomain } = types as Record<
      string,
      TypedDataField[]
    > & { EIP712Domain?: TypedDataField[] };

    // Determine the primary type (the main struct being signed)
    const primaryType = Object.keys(typesWithoutDomain)[0];

    // Use the client's signTypedData method directly
    return this.client.signTypedData({
      account: this._address as `0x${string}`,
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId ? Number(domain.chainId) : undefined,
        verifyingContract: domain.verifyingContract as `0x${string}` | undefined,
        salt: domain.salt as `0x${string}` | undefined,
      },
      types: typesWithoutDomain,
      primaryType,
      message: value,
    });
  }

  /**
   * Signs EIP-712 typed data (legacy method with underscore prefix).
   * Some SDKs may call this method instead of signTypedData.
   */
  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    return this.signTypedData(domain, types, value);
  }

  /**
   * Signs a transaction without broadcasting.
   * Smart wallets don't support this - they must send directly.
   */
  async signTransaction(_tx: TransactionRequest): Promise<string> {
    throw new Error(
      "PrivySmartWalletSigner: Smart wallets do not support signing transactions " +
        "without sending. Use sendTransaction() instead."
    );
  }

  /**
   * Sends a transaction via Privy smart wallet.
   *
   * This is the core method that enables gasless transactions:
   * 1. Receives transaction request from ethers.Contract
   * 2. Routes to Privy smart wallet client
   * 3. Privy uses the paymaster configured in Dashboard for gas sponsorship
   * 4. Returns ethers-compatible TransactionResponse
   *
   * IMPORTANT: Gas sponsorship for smart wallets requires:
   * - Paymaster URL configured in Privy Dashboard > Smart Wallets
   * - Gas policy created in ZeroDev Dashboard that covers the chain/contracts
   */
  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    console.log("[PrivySmartWalletSigner] Sending transaction...");
    console.log("[PrivySmartWalletSigner] To:", tx.to);
    console.log("[PrivySmartWalletSigner] Data length:", tx.data?.toString().length);

    // Send via smart wallet - gas sponsorship is configured at the infrastructure level
    // (Privy Dashboard > Smart Wallets > Paymaster URL + ZeroDev gas policy)
    const hash = await this.client.sendTransaction({
      account: this._address as `0x${string}`,
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? BigInt(tx.value.toString()) : undefined,
    });

    console.log("[PrivySmartWalletSigner] Transaction sent, hash:", hash);

    // CRITICAL: Wait for transaction to be indexed
    // Without this, provider.getTransaction() can return null
    // and the SDK's tx.wait() will fail
    await this.provider.waitForTransaction(hash);

    // Fetch and return the full TransactionResponse
    const response = await this.provider.getTransaction(hash);

    if (!response) {
      throw new Error(
        `PrivySmartWalletSigner: Transaction ${hash} not found after confirmation. ` +
          "This may indicate an RPC indexing issue."
      );
    }

    return response;
  }

  /**
   * Creates a new instance connected to a different provider.
   * Required by AbstractSigner interface.
   */
  connect(provider: Provider): PrivySmartWalletSigner {
    return new PrivySmartWalletSigner(this.client, this._address, provider);
  }
}
