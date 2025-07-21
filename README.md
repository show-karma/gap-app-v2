# GAP App v2 - Frontend Application

GAP (Grantee Accountability Protocol) is a decentralized system for tracking grant funding and impact measurement using blockchain attestations. This is the frontend application built with Next.js.

## 🏗️ Architecture Overview

This application uses a **feature-based architecture** where code is organized by features rather than technical layers. Each feature is self-contained with its own components, hooks, API services, and types.

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
├── features/               # Feature modules (self-contained)
│   ├── auth/              # Authentication feature
│   ├── communities/       # Communities management
│   ├── grants/            # Grants management
│   ├── projects/          # Projects management
│   └── ...                # Other features
├── components/            # Shared components
│   ├── ui/               # Generic UI components
│   ├── layout/           # Layout components (header, footer)
│   ├── providers/        # React context providers
│   └── icons/            # SVG icon components
├── lib/                   # Generic utilities
│   ├── analytics/        # Analytics utilities
│   ├── format/           # Formatting utilities
│   ├── metadata/         # Meta tag utilities
│   ├── monitoring/       # Error monitoring
│   ├── queries/          # React Query utilities
│   ├── share/            # Social sharing utilities
│   └── utils/            # General utilities
├── services/              # External service integrations
│   ├── blockchain/       # Web3 providers and contracts
│   ├── gap-indexer/      # GAP Indexer API client
│   ├── gap-sdk/          # GAP SDK integration
│   └── ens.ts            # ENS service
├── config/               # Application configuration
│   ├── abi/             # Contract ABIs
│   ├── auth.ts          # Auth configuration
│   ├── chains.ts        # Blockchain networks
│   ├── constants.ts     # App constants
│   └── env.ts           # Environment variables
├── hooks/                # Cross-feature hooks only
├── styles/               # Global styles
└── types/                # Global type definitions
```

### Feature Structure

Each feature follows this consistent structure:

```
features/[feature-name]/
├── components/           # Feature-specific components
├── hooks/               # Feature-specific hooks
├── lib/                 # Feature-specific logic (stores, utils)
├── api/                 # Feature API services
├── actions.ts           # Server actions (if applicable)
├── types.ts             # Feature type definitions
└── README.md            # Feature documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or yarn
- A Web3 wallet (MetaMask, etc.)

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd gap-app-v2

# Install dependencies
pnpm install

# Copy environment variables
cp .env-example .env

# Start development server
pnpm dev
```

### Environment Variables

Key environment variables (see `.env-example` for full list):

- `NEXT_PUBLIC_GAP_INDEXER_URL` - GAP Indexer API endpoint
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Dynamic SDK auth
- `NEXT_PUBLIC_WC_PROJECT_ID` - WalletConnect project ID
- Various RPC URLs for supported networks

## 📦 Core Features

### Projects
- Create and manage projects
- Track milestones and updates
- Manage team members
- Impact measurement

### Communities
- Community administration
- Grant programs management
- Impact aggregation
- Member management

### Grants
- Browse grant opportunities
- Track grant milestones
- Submit grant updates
- View funding history

### Authentication
- Web3 wallet connection via Dynamic SDK
- JWT-based API authentication
- Role-based access control

### Impact Measurement
- Define impact indicators
- Submit impact answers
- View aggregated metrics
- Community-level reporting

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
pnpm e2e:headless     # Run E2E tests
pnpm cypress:open     # Open Cypress UI

# Code Quality
pnpm lint             # Run ESLint
pnpm tsc              # Type checking

# Analysis
pnpm build-stats      # Bundle analyzer
```

### Tech Stack

- **Framework**: Next.js 15.3 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + Tremor React + Radix UI
- **State Management**: Zustand (client) + React Query (server)
- **Web3**: Wagmi + Viem + Dynamic SDK
- **Testing**: Jest + React Testing Library + Cypress
- **Package Manager**: pnpm

### Coding Standards

#### TypeScript
- Always use TypeScript for new files
- Avoid `any` - use proper types
- Named exports for components
- Interfaces over types when possible

#### Components
- Use `"use client"` directive when needed
- Absolute imports with `@/` prefix
- Co-locate components with their feature
- Props interface with clear naming

#### State Management
- Zustand for UI/client state
- React Query for server state
- Feature-specific stores in `feature/lib/`
- Proper TypeScript typing

#### API Integration
- Use services layer for external APIs
- Handle errors with `errorManager`
- Implement proper loading states
- Use React Query for caching

## 🧪 Testing

### Unit Testing
- Jest + React Testing Library
- Test files in `__tests__` or alongside source
- Mock external dependencies
- Focus on user behavior

### E2E Testing
- Cypress for critical user flows
- Tests in `cypress/e2e/`
- Run against local development server
- Include accessibility checks

### Running Tests

```bash
# Unit tests
pnpm test
pnpm test:watch
pnpm test:coverage

# E2E tests
pnpm e2e:headless    # Headless mode
pnpm cypress:open    # Interactive mode
```

## 🚢 Deployment

### Build Process

```bash
# Production build
pnpm build

# Analyze bundle
pnpm build-stats
```

### Deployment Platforms

The app can be deployed to:
- Vercel (recommended)
- AWS Amplify
- Netlify
- Any Node.js hosting

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates active
- [ ] Monitoring configured
- [ ] Error tracking enabled

## 📚 Documentation

- [Feature Architecture](./ARCHITECTURE.md) - Detailed architecture guide
- [Migration Plan](./FEATURE_MIGRATION_PLAN.md) - Feature-based migration details
- [Component Guidelines](./src/components/ui/README.md) - UI component standards
- [API Integration](./src/services/README.md) - Service layer patterns
- [Feature Templates](./docs/templates/) - Templates for new features
  - [Feature Template](./docs/templates/FEATURE_TEMPLATE.md)
  - [Component Template](./docs/templates/COMPONENT_TEMPLATE.tsx)
  - [Hook Template](./docs/templates/HOOK_TEMPLATE.ts)

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs:

1. Follow the feature-based architecture
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure linting passes
5. Keep commits atomic and descriptive

## 📄 License

[License information]

## 🔗 Related Projects

- [gap-indexer](../gap-indexer) - Backend indexing service
- [karma-gap-sdk](../karma-gap-sdk) - TypeScript SDK
- [GAP Contracts](https://github.com/karma-gap/contracts) - Smart contracts