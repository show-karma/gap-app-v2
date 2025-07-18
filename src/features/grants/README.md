# Grants Feature

This feature handles all grant-related functionality in the Karma GAP application.

## Structure

```
src/features/grants/
├── components/          # Grant-specific components
│   ├── grant-page/      # Individual grant page components
│   ├── milestones/      # Grant milestone components
│   ├── updates/         # Grant update components
│   └── shared/          # Shared grant components
├── hooks/              # Grant-specific hooks
├── lib/                # Grant utilities and helpers
├── api/                # Grant API clients
├── actions.ts          # Grant actions and utilities
└── types.ts           # Grant type definitions
```

## Key Components

- **GrantPage**: Individual grant display and management
- **GrantMilestonesAndUpdates**: Grant milestone and update management
- **GrantForm**: Grant creation and editing forms
- **MilestoneCard**: Milestone display component
- **GrantUpdate**: Grant update components

## Hooks

- **useGrant**: Core grant data management
- **useGrants**: Grant listing and filtering
- **useGrantMilestoneForm**: Grant milestone form handling
- **useMilestone**: Milestone management
- **useMilestoneActions**: Milestone actions
- **useUpdateActions**: Grant update actions

## Migration Status

This feature is currently being migrated from the legacy structure:
- `components/Pages/Grants/*` → `features/grants/components/`
- `components/Pages/GrantMilestonesAndUpdates/*` → `features/grants/components/`
- `hooks/useGrant*` → `features/grants/hooks/`
- `hooks/useMilestone*` → `features/grants/hooks/`