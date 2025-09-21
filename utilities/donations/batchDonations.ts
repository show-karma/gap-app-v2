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
