// Hook Template - Copy and customize for your needs

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { errorManager } from '@/lib/utils/error-manager';

// ===========================
// Type Definitions
// ===========================

interface Use[HookName]Options {
  /**
   * Whether to enable automatic fetching
   */
  enabled?: boolean;
  /**
   * Callback fired on success
   */
  onSuccess?: (data: any) => void;
  /**
   * Callback fired on error
   */
  onError?: (error: Error) => void;
  // Add more options as needed
}

interface Use[HookName]Return {
  // Data
  data: any;
  // States
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // Actions
  refetch: () => void;
  // Add more return values as needed
}

// ===========================
// Hook Implementation
// ===========================

/**
 * use[HookName] - Brief description of what this hook does
 * 
 * @param {string} id - The ID of the resource
 * @param {Use[HookName]Options} options - Hook options
 * @returns {Use[HookName]Return} Hook return values
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = use[HookName]('123', {
 *   enabled: true,
 *   onSuccess: (data) => console.log('Success!', data),
 * });
 * ```
 */
export function use[HookName](
  id: string,
  options: Use[HookName]Options = {}
): Use[HookName]Return {
  const { enabled = true, onSuccess, onError } = options;
  
  // ===========================
  // Query Client (for cache management)
  // ===========================
  
  const queryClient = useQueryClient();
  
  // ===========================
  // Local State (if needed)
  // ===========================
  
  const [localState, setLocalState] = useState<any>(null);
  
  // ===========================
  // Query Hook (for data fetching)
  // ===========================
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['[resource]', id],
    queryFn: async () => {
      // Replace with actual API call
      const response = await fetch(`/api/[resource]/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch [resource]');
      }
      return response.json();
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: Error) => {
      errorManager.logError(error, 'Failed to fetch [resource]');
      if (onError) {
        onError(error);
      }
    },
  });
  
  // ===========================
  // Mutation Hook (for data updates)
  // ===========================
  
  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      // Replace with actual API call
      const response = await fetch(`/api/[resource]/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error('Failed to update [resource]');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['[resource]', id] });
      toast.success('[Resource] updated successfully');
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: Error) => {
      errorManager.logError(error, 'Failed to update [resource]');
      toast.error('Failed to update [resource]');
      if (onError) {
        onError(error);
      }
    },
  });
  
  // ===========================
  // Callbacks (memoized functions)
  // ===========================
  
  const handleUpdate = useCallback(
    async (updateData: any) => {
      return updateMutation.mutateAsync(updateData);
    },
    [updateMutation]
  );
  
  // ===========================
  // Effects (side effects)
  // ===========================
  
  useEffect(() => {
    // Perform side effects when data changes
    if (data) {
      setLocalState(data);
    }
  }, [data]);
  
  // ===========================
  // Computed Values (memoized)
  // ===========================
  
  const computedValue = useMemo(() => {
    if (!data) return null;
    // Perform expensive calculations
    return data;
  }, [data]);
  
  // ===========================
  // Return Values
  // ===========================
  
  return {
    // Data
    data: computedValue,
    // States
    isLoading,
    isError,
    error,
    isUpdating: updateMutation.isPending,
    // Actions
    refetch,
    update: handleUpdate,
  };
}

// ===========================
// Related Hooks (if needed)
// ===========================

/**
 * use[HookName]List - Fetch a list of [resource]s
 */
export function use[HookName]List(options: Use[HookName]Options = {}) {
  return useQuery({
    queryKey: ['[resource]s'],
    queryFn: async () => {
      const response = await fetch('/api/[resource]s');
      if (!response.ok) {
        throw new Error('Failed to fetch [resource]s');
      }
      return response.json();
    },
    ...options,
  });
}

/**
 * useCreate[HookName] - Create a new [resource]
 */
export function useCreate[HookName]() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (createData: any) => {
      const response = await fetch('/api/[resource]s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      if (!response.ok) {
        throw new Error('Failed to create [resource]');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[resource]s'] });
      toast.success('[Resource] created successfully');
    },
    onError: (error: Error) => {
      errorManager.logError(error, 'Failed to create [resource]');
      toast.error('Failed to create [resource]');
    },
  });
}

// ===========================
// Template Instructions
// ===========================

/**
 * How to use this template:
 * 
 * 1. Copy this file to your hooks location
 * 2. Replace all instances of [HookName] with your actual hook name
 * 3. Replace [resource] with your resource name (lowercase)
 * 4. Replace [Resource] with your resource name (PascalCase)
 * 5. Update the type definitions
 * 6. Implement the actual API calls
 * 7. Update or remove related hooks as needed
 * 8. Update the examples in the documentation
 * 9. Remove these template instructions
 * 
 * Naming conventions:
 * - File: use-[resource].ts (e.g., use-project.ts)
 * - Hook: use[Resource] (e.g., useProject)
 * - Types: Use[Resource]Options, Use[Resource]Return
 * 
 * Best practices:
 * - Always handle loading and error states
 * - Use React Query for server state
 * - Provide proper TypeScript types
 * - Handle errors gracefully
 * - Show user-friendly toast messages
 * - Log errors for debugging
 * - Memoize expensive computations
 * - Clean up side effects
 * - Document complex logic
 * 
 * Common patterns:
 * - Data fetching: useQuery
 * - Data mutations: useMutation
 * - Cache management: useQueryClient
 * - Optimistic updates: onMutate callback
 * - Polling: refetchInterval option
 * - Dependent queries: enabled option
 */