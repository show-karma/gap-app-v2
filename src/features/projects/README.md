# Projects Feature

This feature handles all project-related functionality in the Karma GAP application.

## Structure

```
src/features/projects/
├── components/          # Project-specific components
│   ├── project-page/    # Individual project page components
│   ├── my-projects/     # My projects page components
│   ├── new-projects/    # New projects listing components
│   └── shared/          # Shared project components
├── hooks/              # Project-specific hooks
├── lib/                # Project utilities and helpers
├── api/                # Project API clients
├── actions.ts          # Project actions and utilities
└── types.ts           # Project type definitions
```

## Key Components

- **ProjectPage**: Individual project display and management
- **MyProjects**: User's project dashboard
- **NewProjects**: Discovery of new projects
- **ProjectFeed**: Project activity feed
- **ProjectDialogs**: Project creation and management dialogs

## Hooks

- **useProject**: Core project data management
- **useProjectInstance**: Project instance handling
- **useProjectMembers**: Project team management
- **useProjectPermissions**: Project access control
- **useProjectSocials**: Project social links management
- **useProjectMilestoneForm**: Project milestone form handling

## Migration Status

This feature is currently being migrated from the legacy structure:
- `components/Pages/Project/*` → `features/projects/components/`
- `hooks/useProject*` → `features/projects/hooks/`