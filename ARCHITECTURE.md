# GAP App v2 - Architecture Guide

## Overview

GAP App v2 follows a **feature-based architecture** pattern, organizing code by business domains rather than technical layers. This approach improves maintainability, scalability, and developer experience by creating self-contained feature modules.

## Core Principles

### 1. Feature Isolation
Each feature is self-contained with its own:
- Components
- Hooks
- State management
- API services
- Types
- Business logic

### 2. Clear Boundaries
- Features should not import directly from other features
- Cross-feature communication happens through:
  - Services layer
  - Shared types
  - Event systems

### 3. Dependency Direction
```
app/ → features/ → services/ → external APIs
         ↓           ↓
    components/    config/
         ↓           ↓
       lib/       types/
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router (pages & routes)
├── features/               # Business domain features
├── components/             # Shared UI components
├── services/               # External service integrations
├── lib/                    # Shared utilities
├── config/                 # Application configuration
├── hooks/                  # Cross-feature hooks
├── styles/                 # Global styles
└── types/                  # Global type definitions
```

## Feature Architecture

### Standard Feature Structure

```
features/[feature-name]/
├── components/             # Feature-specific components
│   ├── [Component].tsx    # React components
│   └── forms/             # Form components
├── hooks/                  # Feature-specific hooks
│   └── use-[feature].ts   # Custom React hooks
├── lib/                    # Feature business logic
│   ├── store.ts           # Zustand store
│   └── utils.ts           # Helper functions
├── api/                    # API service layer
│   └── [feature]-service.ts
├── actions.ts              # Server actions (App Router)
├── types.ts                # Feature type definitions
└── README.md               # Feature documentation
```

### Example: Projects Feature

```
features/projects/
├── components/
│   ├── project-card.tsx
│   ├── project-list.tsx
│   ├── project-details/
│   │   ├── header.tsx
│   │   ├── milestones.tsx
│   │   └── team.tsx
│   └── forms/
│       ├── create-project.tsx
│       └── edit-project.tsx
├── hooks/
│   ├── use-project.ts
│   ├── use-project-members.ts
│   └── use-project-permissions.ts
├── lib/
│   ├── store.ts           # Project UI state
│   └── validators.ts      # Form validation
├── api/
│   ├── project-service.ts # API calls
│   └── attestation-service.ts
├── actions.ts             # Server actions
└── types.ts               # Project types
```

## Component Organization

### Shared Components (`/components`)

Only truly generic, reusable components:

```
components/
├── ui/                    # Generic UI elements
│   ├── button.tsx
│   ├── card.tsx
│   ├── modal.tsx
│   └── form-fields/
├── layout/                # App layout components
│   ├── header.tsx
│   └── footer.tsx
├── providers/             # React providers
└── icons/                 # SVG icons
```

### Feature Components

Feature-specific components stay within features:
- If a component is only used by one feature, it belongs in that feature
- If multiple features need it, consider:
  1. Making it generic and moving to `/components/ui`
  2. Creating a shared feature module
  3. Using composition patterns

## State Management

### Client State (Zustand)

Each feature has its own store in `feature/lib/store.ts`:

```typescript
// features/projects/lib/store.ts
import { create } from 'zustand';

interface ProjectStore {
  selectedProject: Project | null;
  filters: ProjectFilters;
  setSelectedProject: (project: Project | null) => void;
  setFilters: (filters: ProjectFilters) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProject: null,
  filters: {},
  setSelectedProject: (project) => set({ selectedProject: project }),
  setFilters: (filters) => set({ filters }),
}));
```

### Server State (React Query)

API data is managed with React Query:

```typescript
// features/projects/hooks/use-project.ts
import { useQuery } from '@tanstack/react-query';
import { projectService } from '../api/project-service';

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## Services Layer

External integrations are abstracted in `/services`:

```
services/
├── blockchain/            # Web3 integrations
│   ├── providers/        # RPC providers
│   ├── contracts/        # Smart contract interfaces
│   └── utils/            # Blockchain utilities
├── gap-indexer/          # Backend API client
├── gap-sdk/              # GAP SDK wrapper
└── ens.ts                # ENS integration
```

### Service Interface Example

```typescript
// services/gap-indexer/gap-indexer.ts
class GapIndexerClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  }

  async get<T>(endpoint: string): Promise<T> {
    // Implementation with error handling
  }

  // Specific methods for features to use
  async getProjects(filters?: ProjectFilters) {
    return this.get<ProjectsResponse>('/projects', { params: filters });
  }
}

export const gapIndexer = new GapIndexerClient();
```

## Cross-Feature Communication

### 1. Through Services

Features communicate through the services layer:

```typescript
// features/grants/hooks/use-project-grants.ts
import { useProject } from '@/features/projects/hooks/use-project';

export function useProjectGrants(projectId: string) {
  const { data: project } = useProject(projectId);
  // Use project data for grants
}
```

### 2. Through Events

For decoupled communication:

```typescript
// lib/events/project-events.ts
export const projectEvents = {
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
};

// Emit from one feature
window.dispatchEvent(new CustomEvent(projectEvents.PROJECT_CREATED, {
  detail: { projectId }
}));

// Listen in another feature
useEffect(() => {
  const handler = (e: CustomEvent) => {
    // Handle event
  };
  window.addEventListener(projectEvents.PROJECT_CREATED, handler);
  return () => window.removeEventListener(projectEvents.PROJECT_CREATED, handler);
}, []);
```

### 3. Through Shared Types

Common types in `/types`:

```typescript
// types/entities.ts
export interface User {
  id: string;
  address: string;
  ens?: string;
}

// Used by multiple features
import { User } from '@/types/entities';
```

## Best Practices

### 1. Feature Independence
- Features should work in isolation
- Minimize cross-feature dependencies
- Use dependency injection patterns

### 2. Consistent Naming
- Use kebab-case for files: `use-project-list.ts`
- Use PascalCase for components: `ProjectCard.tsx`
- Prefix hooks with `use`: `useProjectData`
- Suffix services with `Service`: `projectService`

### 3. Type Safety
- Define types in `types.ts` within each feature
- Use discriminated unions for complex states
- Avoid `any` types

### 4. Testing Strategy
- Unit tests alongside components
- Integration tests for API services
- E2E tests for critical user flows

### 5. Performance
- Code split by route
- Lazy load heavy features
- Use React.memo for expensive components
- Implement virtual scrolling for lists

## Migration Guidelines

When adding new features:

1. **Create feature directory** with standard structure
2. **Define types first** in `types.ts`
3. **Build API service** if needed
4. **Create hooks** for data fetching
5. **Build components** from bottom up
6. **Add to app routes** last

When refactoring existing code:

1. **Identify feature boundary**
2. **Move related code together**
3. **Update imports**
4. **Test thoroughly**
5. **Update documentation**

## Common Patterns

### Loading States

```typescript
// features/projects/components/project-list.tsx
export function ProjectList() {
  const { data, isLoading, error } = useProjects();

  if (isLoading) return <ProjectListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;

  return <ProjectGrid projects={data} />;
}
```

### Form Handling

```typescript
// features/projects/components/forms/create-project.tsx
export function CreateProjectForm() {
  const createProject = useCreateProject();
  
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      await createProject.mutateAsync(data);
      toast.success('Project created!');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  return <Form form={form} onSubmit={onSubmit} />;
}
```

### Error Boundaries

```typescript
// features/projects/components/project-boundary.tsx
export function ProjectErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary
      fallback={<ProjectErrorFallback />}
      onError={(error) => errorManager.logError(error, 'Project')}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## Troubleshooting

### Circular Dependencies
- Check import paths
- Move shared code to `/lib` or `/services`
- Use dependency injection

### Performance Issues
- Profile with React DevTools
- Check for unnecessary re-renders
- Implement proper memoization

### Type Errors
- Ensure consistent type definitions
- Use proper generic constraints
- Check for version mismatches

## Future Considerations

### Micro-Frontend Architecture
The current feature-based structure can evolve into micro-frontends:
- Each feature as a separate package
- Independent deployment
- Runtime composition

### Module Federation
Features can be loaded dynamically:
- Reduced initial bundle size
- Independent feature updates
- Better code splitting

### Monorepo Structure
Features could become packages:
```
packages/
├── features/
│   ├── projects/
│   ├── grants/
│   └── communities/
├── shared/
│   ├── ui/
│   └── utils/
└── apps/
    └── web/
```

## Resources

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Next.js App Router Patterns](https://nextjs.org/docs/app/building-your-application)
- [React Query Patterns](https://tanstack.com/query/latest/docs/react/guides/queries)