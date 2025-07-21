// Component Template - Copy and customize for your needs

import { type FC, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

// ===========================
// Type Definitions
// ===========================

interface [ComponentName]Props {
  /**
   * Children elements to render
   */
  children?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the component is in a loading state
   */
  isLoading?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  // Add more props as needed
}

// ===========================
// Component Implementation
// ===========================

/**
 * [ComponentName] - Brief description of what this component does
 * 
 * @example
 * ```tsx
 * <[ComponentName] isLoading={false}>
 *   Content goes here
 * </[ComponentName]>
 * ```
 */
export const [ComponentName]: FC<[ComponentName]Props> = ({
  children,
  className,
  isLoading = false,
  onClick,
}) => {
  // ===========================
  // Hooks (if needed)
  // ===========================
  
  // const [state, setState] = useState();
  // const { data } = useQuery();
  
  // ===========================
  // Event Handlers
  // ===========================
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // ===========================
  // Render Logic
  // ===========================
  
  if (isLoading) {
    return <[ComponentName]Skeleton className={className} />;
  }

  return (
    <div
      className={cn(
        // Base styles
        'relative rounded-lg border bg-card p-6',
        // Interactive states
        'transition-colors hover:bg-accent',
        // Conditional styles
        onClick && 'cursor-pointer',
        // Custom classes
        className
      )}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {children}
    </div>
  );
};

// ===========================
// Sub-components
// ===========================

/**
 * [ComponentName]Title - Title section of [ComponentName]
 */
export const [ComponentName]Title: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <h3 className={cn('text-lg font-semibold', className)}>
      {children}
    </h3>
  );
};

/**
 * [ComponentName]Description - Description section of [ComponentName]
 */
export const [ComponentName]Description: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)}>
      {children}
    </p>
  );
};

// ===========================
// Loading State
// ===========================

/**
 * [ComponentName]Skeleton - Loading skeleton for [ComponentName]
 */
export const [ComponentName]Skeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 animate-pulse',
        className
      )}
    >
      <div className="h-5 w-1/3 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded" />
    </div>
  );
};

// ===========================
// Examples & Documentation
// ===========================

/**
 * Example usage:
 * 
 * Basic usage:
 * ```tsx
 * <[ComponentName]>
 *   <[ComponentName]Title>Title here</[ComponentName]Title>
 *   <[ComponentName]Description>Description here</[ComponentName]Description>
 * </[ComponentName]>
 * ```
 * 
 * With click handler:
 * ```tsx
 * <[ComponentName] onClick={() => console.log('clicked')}>
 *   Clickable content
 * </[ComponentName]>
 * ```
 * 
 * With loading state:
 * ```tsx
 * <[ComponentName] isLoading={true} />
 * ```
 */

// ===========================
// Template Instructions
// ===========================

/**
 * How to use this template:
 * 
 * 1. Copy this file to your component location
 * 2. Replace all instances of [ComponentName] with your actual component name
 * 3. Update the props interface with your component's props
 * 4. Implement the component logic
 * 5. Update or remove sub-components as needed
 * 6. Update the skeleton component to match your UI
 * 7. Update the examples in the documentation
 * 8. Remove these template instructions
 * 
 * Naming conventions:
 * - File: kebab-case.tsx (e.g., user-profile-card.tsx)
 * - Component: PascalCase (e.g., UserProfileCard)
 * - Props: [ComponentName]Props (e.g., UserProfileCardProps)
 * 
 * Best practices:
 * - Use TypeScript for all props
 * - Include JSDoc comments for complex props
 * - Provide loading states when applicable
 * - Ensure keyboard accessibility
 * - Use semantic HTML elements
 * - Apply consistent styling with Tailwind classes
 * - Memoize expensive computations
 * - Handle error states gracefully
 */