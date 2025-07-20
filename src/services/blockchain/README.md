# Blockchain Services

This directory contains all blockchain-related abstractions and integrations.

## Structure

```
blockchain/
├── contracts/      # Contract-specific clients and interfaces
├── providers/      # Web3 provider configurations
├── utils/          # Blockchain utility functions
└── types.ts        # Shared blockchain types
```

## Guidelines

1. All blockchain interactions should go through this service layer
2. Use typed clients for contract interactions
3. Abstract away Web3 library specifics (wagmi/viem/ethers)
4. Handle network switching and error cases gracefully
5. Provide mock implementations for testing