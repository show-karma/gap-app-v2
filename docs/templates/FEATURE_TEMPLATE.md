# Feature Template

Use this template when creating a new feature module.

## 1. Create Feature Directory Structure

```bash
# Create the feature directory
mkdir -p src/features/[feature-name]/{components,hooks,lib,api}

# Create standard files
touch src/features/[feature-name]/types.ts
touch src/features/[feature-name]/actions.ts
touch src/features/[feature-name]/README.md
```

## 2. Types Definition (types.ts)

```typescript
// src/features/[feature-name]/types.ts

// Entity types
export interface [Feature] {
  id: string;
  // ... properties
}

// API types
export interface [Feature]Response {
  data: [Feature][];
  pagination: Pagination;
}

// Form types
export interface Create[Feature]Input {
  // ... form fields
}

// State types
export interface [Feature]Filters {
  // ... filter options
}

export interface [Feature]Store {
  // ... store state
}
```

## 3. API Service (api/[feature]-service.ts)

```typescript
// src/features/[feature-name]/api/[feature]-service.ts
import { fetchData } from '@/lib/utils/fetch-data';
import type { [Feature], [Feature]Response, Create[Feature]Input } from '../types';

class [Feature]Service {
  private baseUrl = '/api/[feature-name]';

  async get[Feature]s(filters?: [Feature]Filters): Promise<[Feature]Response> {
    return fetchData<[Feature]Response>(`${this.baseUrl}`, { 
      params: filters 
    });
  }

  async get[Feature](id: string): Promise<[Feature]> {
    return fetchData<[Feature]>(`${this.baseUrl}/${id}`);
  }

  async create[Feature](data: Create[Feature]Input): Promise<[Feature]> {
    return fetchData<[Feature]>(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update[Feature](id: string, data: Partial<[Feature]>): Promise<[Feature]> {
    return fetchData<[Feature]>(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete[Feature](id: string): Promise<void> {
    await fetchData(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }
}

export const [feature]Service = new [Feature]Service();
```

## 4. Store (lib/store.ts)

```typescript
// src/features/[feature-name]/lib/store.ts
import { create } from 'zustand';
import type { [Feature]Store } from '../types';

export const use[Feature]Store = create<[Feature]Store>((set) => ({
  // State
  selected[Feature]: null,
  filters: {},
  isCreateModalOpen: false,

  // Actions
  setSelected[Feature]: ([feature]) => set({ selected[Feature]: [feature] }),
  setFilters: (filters) => set({ filters }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  reset: () => set({
    selected[Feature]: null,
    filters: {},
    isCreateModalOpen: false,
  }),
}));
```

## 5. Hooks

### Data Fetching Hook (hooks/use-[feature].ts)

```typescript
// src/features/[feature-name]/hooks/use-[feature].ts
import { useQuery } from '@tanstack/react-query';
import { [feature]Service } from '../api/[feature]-service';

export function use[Feature](id: string) {
  return useQuery({
    queryKey: ['[feature]', id],
    queryFn: () => [feature]Service.get[Feature](id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### List Hook (hooks/use-[feature]s.ts)

```typescript
// src/features/[feature-name]/hooks/use-[feature]s.ts
import { useQuery } from '@tanstack/react-query';
import { [feature]Service } from '../api/[feature]-service';
import { use[Feature]Store } from '../lib/store';

export function use[Feature]s() {
  const filters = use[Feature]Store((state) => state.filters);

  return useQuery({
    queryKey: ['[feature]s', filters],
    queryFn: () => [feature]Service.get[Feature]s(filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Mutation Hook (hooks/use-create-[feature].ts)

```typescript
// src/features/[feature-name]/hooks/use-create-[feature].ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { [feature]Service } from '../api/[feature]-service';
import { use[Feature]Store } from '../lib/store';
import { errorManager } from '@/lib/utils/error-manager';

export function useCreate[Feature]() {
  const queryClient = useQueryClient();
  const closeModal = use[Feature]Store((state) => state.closeCreateModal);

  return useMutation({
    mutationFn: [feature]Service.create[Feature],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['[feature]s'] });
      toast.success('[Feature] created successfully');
      closeModal();
    },
    onError: (error) => {
      errorManager.logError(error, 'Failed to create [feature]');
      toast.error('Failed to create [feature]');
    },
  });
}
```

## 6. Components

### List Component (components/[feature]-list.tsx)

```typescript
// src/features/[feature-name]/components/[feature]-list.tsx
"use client";

import { use[Feature]s } from '../hooks/use-[feature]s';
import { [Feature]Card } from './[feature]-card';
import { [Feature]ListSkeleton } from './[feature]-list-skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';

export function [Feature]List() {
  const { data, isLoading, error } = use[Feature]s();

  if (isLoading) return <[Feature]ListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.data.length) {
    return (
      <EmptyState
        title="No [feature]s found"
        description="Create your first [feature] to get started"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.data.map(([feature]) => (
        <[Feature]Card key={[feature].id} [feature]={[feature]} />
      ))}
    </div>
  );
}
```

### Form Component (components/forms/create-[feature]-form.tsx)

```typescript
// src/features/[feature-name]/components/forms/create-[feature]-form.tsx
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreate[Feature] } from '../../hooks/use-create-[feature]';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const create[Feature]Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  // ... other fields
});

type FormData = z.infer<typeof create[Feature]Schema>;

export function Create[Feature]Form() {
  const createMutation = useCreate[Feature]();
  
  const form = useForm<FormData>({
    resolver: zodResolver(create[Feature]Schema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full"
        >
          {createMutation.isPending ? 'Creating...' : 'Create [Feature]'}
        </Button>
      </form>
    </Form>
  );
}
```

## 7. Server Actions (actions.ts)

```typescript
// src/features/[feature-name]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { [feature]Service } from './api/[feature]-service';
import type { Create[Feature]Input } from './types';

export async function create[Feature]Action(data: Create[Feature]Input) {
  try {
    const [feature] = await [feature]Service.create[Feature](data);
    revalidatePath('/[feature]s');
    redirect(`/[feature]s/${[feature].id}`);
  } catch (error) {
    throw new Error('Failed to create [feature]');
  }
}

export async function update[Feature]Action(id: string, data: Partial<Create[Feature]Input>) {
  try {
    await [feature]Service.update[Feature](id, data);
    revalidatePath(`/[feature]s/${id}`);
    revalidatePath('/[feature]s');
  } catch (error) {
    throw new Error('Failed to update [feature]');
  }
}

export async function delete[Feature]Action(id: string) {
  try {
    await [feature]Service.delete[Feature](id);
    revalidatePath('/[feature]s');
    redirect('/[feature]s');
  } catch (error) {
    throw new Error('Failed to delete [feature]');
  }
}
```

## 8. Feature README

```markdown
# [Feature Name] Feature

## Overview

[Brief description of what this feature does]

## Structure

- `components/` - React components for [feature]
- `hooks/` - Custom hooks for data fetching and mutations
- `lib/` - Business logic and state management
- `api/` - API service layer
- `types.ts` - TypeScript type definitions
- `actions.ts` - Server actions for mutations

## Usage

### Displaying [Feature]s

\```tsx
import { [Feature]List } from '@/features/[feature-name]/components/[feature]-list';

export default function [Feature]sPage() {
  return <[Feature]List />;
}
\```

### Creating a [Feature]

\```tsx
import { Create[Feature]Form } from '@/features/[feature-name]/components/forms/create-[feature]-form';

export default function Create[Feature]Page() {
  return <Create[Feature]Form />;
}
\```

## API Endpoints

- `GET /api/[feature-name]` - List all [feature]s
- `GET /api/[feature-name]/:id` - Get single [feature]
- `POST /api/[feature-name]` - Create new [feature]
- `PATCH /api/[feature-name]/:id` - Update [feature]
- `DELETE /api/[feature-name]/:id` - Delete [feature]

## State Management

This feature uses Zustand for client-side state management. The store includes:

- `selected[Feature]` - Currently selected [feature]
- `filters` - Active filters
- `isCreateModalOpen` - Modal state

## Dependencies

- React Query for data fetching
- Zustand for state management
- React Hook Form for forms
- Zod for validation
```

## 9. Integration Checklist

- [ ] Create feature directory structure
- [ ] Define types in `types.ts`
- [ ] Implement API service
- [ ] Create Zustand store
- [ ] Build data fetching hooks
- [ ] Create components
- [ ] Add server actions
- [ ] Write feature README
- [ ] Add feature routes to app directory
- [ ] Update main navigation
- [ ] Add feature to TypeScript paths
- [ ] Write tests
- [ ] Update documentation

## Usage

1. Copy this template
2. Replace `[feature-name]` with lowercase kebab-case name (e.g., `user-profiles`)
3. Replace `[Feature]` with PascalCase name (e.g., `UserProfile`)
4. Replace `[feature]` with camelCase name (e.g., `userProfile`)
5. Implement each section according to your feature's needs
6. Follow the integration checklist