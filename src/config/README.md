# Config Directory

This directory contains static configuration files and constants used throughout the application.

## Structure

```
config/
├── abi/            # Contract ABI files
├── chains.ts       # Blockchain network configurations
├── contracts.ts    # Contract addresses by network
├── constants.ts    # Application-wide constants
└── env.ts          # Environment variable access
```

## Guidelines

1. All configuration should be centralized here
2. Use TypeScript for type safety
3. Environment-specific values should use env.ts
4. Contract ABIs should be in JSON format
5. Keep configurations organized by domain