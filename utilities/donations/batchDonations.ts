/**
 * SECURITY DOCUMENTATION - Permit2 Integration
 *
 * This contract uses Uniswap's Permit2 pattern for secure token transfers:
 *
 * 1. PERMIT2 ADDRESS: 0x000000000022D473030F116dDEE9F6B43aC78BA3
 *    - Deployed on all major EVM chains at the same address
 *    - Audited by OpenZeppelin, Trail of Bits, and ABDK
 *    - Used by Uniswap, 1inch, Cowswap, and other major protocols
 *    - Reference: https://github.com/Uniswap/permit2
 *
 * 2. SECURITY MODEL:
 *    - Users approve ERC20 tokens to Permit2 (one-time, unlimited for UX)
 *    - Each transfer requires a valid EIP-712 signature from the user
 *    - Signatures include: token, amount, spender, nonce, deadline
 *    - Prevents unauthorized transfers even with unlimited approval
 *
 * 3. TRANSACTION FLOW:
 *    a. User approves token to Permit2 (if not already approved)
 *    b. User signs Permit2 signature for specific transfer
 *    c. Contract calls Permit2.permitBatchTransferFrom with signature
 *    d. Permit2 validates signature and transfers tokens atomically
 *    e. Tokens are immediately forwarded to project payout addresses
 *
 * 4. REENTRANCY PROTECTION:
 *    - All state changes happen before external calls (checks-effects-interactions)
 *    - Batch donations are atomic (all succeed or all fail)
 *    - No intermediate state where funds could be stolen
 *
 * 5. BEST PRACTICES COMPLIANCE:
 *    ✓ Using canonical Permit2 address
 *    ✓ Proper EIP-712 domain and type definitions
 *    ✓ Deadline enforcement (1 hour default)
 *    ✓ Random nonce generation to prevent replay attacks
 *    ✓ Signature validation before transfer execution
 */
export const BatchDonationsABI = [
  {
    "inputs": [],
    "name": "ETHTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncorrectETHAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProjectAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSpender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoDonationsProvided",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooManyProjects",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "donor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "projectCount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalETH",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTokenTransfers",
        "type": "uint256"
      }
    ],
    "name": "BatchDonationCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "donor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "DonationMade",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_PROJECTS_PER_BATCH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PERMIT2",
    "outputs": [
      {
        "internalType": "contract IPermit2",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PERMIT3",
    "outputs": [
      {
        "internalType": "contract IPermit3",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "project",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "ethAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct BatchDonations.ProjectDonation[]",
        "name": "donations",
        "type": "tuple[]"
      }
    ],
    "name": "batchDonate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "project",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "ethAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct BatchDonations.ProjectDonation[]",
        "name": "donations",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPermit2.TokenPermissions[]",
            "name": "permitted",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct IPermit2.PermitBatchTransferFrom",
        "name": "permit",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "batchDonateWithPermit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "project",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "ethAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct BatchDonations.ProjectDonation[]",
        "name": "donations",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32[]",
        "name": "proof",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "batchDonateWithPermit3",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

export type BatchDonationsAbi = typeof BatchDonationsABI;

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

type HexAddress = `0x${string}`;

export const BATCH_DONATIONS_CONTRACTS: Record<number, HexAddress | null> = {
  1: null, // Ethereum Mainnet - TODO: set deployed address
  10: null, // Optimism Mainnet - TODO: set deployed address
  137: null, // Polygon Mainnet - TODO: set deployed address
  42161: null, // Arbitrum One - TODO: set deployed address
  42220: null, // Celo Mainnet - TODO: set deployed address
  8453: null, // Base Mainnet - TODO: set deployed address
  11155111: "0x90129074c8e8c35BC1ee65063fB950CA0F7b1816", // Sepolia
  11155420: "0xeeac526f84f96a9dE82F5ABC61A2f49Ed610c604", // Optimism Sepolia
  84532: "0xBA210F015ca793CE480e1d259AB8Bf6086D1Ce7c", // Base Sepolia
};

export const getBatchDonationsContractAddress = (
  chainId: number
): HexAddress | null => BATCH_DONATIONS_CONTRACTS[chainId] ?? null;
