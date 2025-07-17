# UI Components Directory

This directory contains generic, reusable UI components that form the design system of the GAP application. These components are presentational and should not contain business logic.

## Structure

```
ui/
├── button.tsx          # Generic button component
├── card.tsx           # Card container component
├── dropdown.tsx       # Dropdown components
├── modal/             # Modal base components
├── skeleton/          # Loading skeleton components
└── ...                # Other generic UI components
```

## Guidelines

1. Components here should be purely presentational
2. They should not import from features or contain business logic
3. Use TypeScript interfaces for all props
4. Include proper accessibility attributes
5. Follow the existing styling patterns with TailwindCSS
6. These components should be usable across all features