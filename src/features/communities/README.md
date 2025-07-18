# Communities Feature

This feature handles all community-related functionality in the Karma GAP application.

## Structure

```
src/features/communities/
├── components/          # Community-specific components
│   ├── community-page/  # Individual community page components
│   ├── impact/         # Community impact components
│   ├── tracks/         # Community tracks management
│   └── shared/         # Shared community components
├── hooks/              # Community-specific hooks
├── lib/                # Community utilities and stores
├── api/                # Community API clients
├── actions.ts          # Community actions and utilities
└── types.ts           # Community type definitions
```

## Key Components

- **CommunityPage**: Individual community display and management
- **CommunityAdmin**: Community administration interface
- **CommunityStats**: Community statistics and metrics
- **CommunityFeed**: Community activity feed
- **TracksAdmin**: Community tracks management
- **ImpactPage**: Community impact measurement

## Hooks

- **useCommunityDetails**: Core community data management
- **useCommunityCategory**: Community category management
- **useIsCommunityAdmin**: Community admin permissions
- **useAdminCommunities**: Admin communities listing

## Migration Status

This feature is currently being migrated from the legacy structure:
- `components/Pages/Communities/*` → `features/communities/components/`
- `hooks/useCommunity*` → `features/communities/hooks/`
- `store/communities.ts` → `features/communities/lib/`