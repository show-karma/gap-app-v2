# Features Directory

This directory contains all feature modules of the GAP application. Each feature is a self-contained module with its own components, hooks, types, and business logic.

## Structure

Each feature follows this standard structure:

```
features/
└── [feature-name]/
    ├── components/     # React components specific to this feature
    ├── hooks/          # Custom hooks for this feature
    ├── lib/            # Feature-specific utilities and stores
    ├── api/            # API calls and data transformation
    ├── actions.ts      # Server actions (if applicable)
    └── types.ts        # TypeScript types for this feature
```

## Features

- `projects/` - Project management and display
- `communities/` - Community management and exploration
- `grants/` - Grant tracking and milestones
- `impact/` - Impact measurement and reporting
- `auth/` - Authentication and user management
- (more to be added during migration)

## Guidelines

1. Features should be self-contained and not import from other features directly
2. Shared functionality should be in the root `lib/` or `components/ui/`
3. Use the `services/` layer for external data access
4. Each feature should export its public API through an index.ts file