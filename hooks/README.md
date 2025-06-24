# Project Hook Refactoring

This document explains the refactoring of the `ProjectWrapper` component logic into custom React Query hooks.

## Hooks Created

### 1. `useProjectPermissions`
**Purpose**: Manages project permission checks using React Query and updates Zustand state automatically.

**Usage**:
```typescript
const { isProjectOwner, isProjectAdmin, isLoading, refetch } = useProjectPermissions(
  projectId,
  project,
  projectInstance
);
```

**Features**:
- Checks if the current user is a project owner or admin
- Automatically updates Zustand store with permission states
- Provides caching with 5-minute stale time
- Handles loading states automatically
- Includes error handling

### 2. `useProjectSocials`
**Purpose**: Processes and formats social media links from project data.

**Usage**:
```typescript
const socials = useProjectSocials(project?.details?.data.links);
```

**Returns**: Array of social links with:
- `name`: Social platform name
- `url`: Formatted URL
- `icon`: React component for the icon

### 3. `useProjectMembers`
**Purpose**: Processes project members and ensures the owner is included.

**Usage**:
```typescript
const members = useProjectMembers(project);
```

**Returns**: Array of members with:
- `uid`: Member unique identifier
- `recipient`: Member address
- `details`: Optional member details (name, etc.)

## Benefits of This Refactoring

1. **Separation of Concerns**: Logic is now separated into focused, reusable hooks
2. **Performance**: React Query provides intelligent caching and background refetching
3. **Type Safety**: Each hook has proper TypeScript types
4. **Maintainability**: Easier to test and modify individual pieces of logic
5. **State Management**: Zustand state is automatically synchronized with React Query data

## Before and After

### Before:
- Permission logic was in a large `useEffect` in the component
- Social link processing was a large function in the component
- Member processing was another function in the component
- No caching or optimization

### After:
- Clean, focused hooks for each piece of functionality
- Automatic caching and state management
- Component is much simpler and easier to understand
- Logic is reusable across other components

## Example: Complete Component Usage

```typescript
export const ProjectWrapper = ({ projectId }: ProjectWrapperProps) => {
  const { isProjectAdmin, isProjectOwner } = useProjectStore((state) => ({
    isProjectAdmin: state.isProjectAdmin,
    isProjectOwner: state.isProjectOwner,
  }));
  const { project: projectInstance } = useProjectInstance(projectId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { project, isLoading: isProjectLoading } = useProject(projectId);
  
  // All permission logic handled by this hook
  useProjectPermissions(projectId, project, projectInstance);
  
  // Social links processed by this hook
  const socials = useProjectSocials(project?.details?.data.links);
  
  // Members processed by this hook
  const members = useProjectMembers(project);
  
  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner;
  const { data: contactsInfo } = useContactInfo(projectId, isAuthorized);
  const hasContactInfo = Boolean(contactsInfo?.length);

  useTeamProfiles(project);
  
  // Rest of component...
}
```