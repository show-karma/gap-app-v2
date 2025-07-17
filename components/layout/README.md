# Layout Components

This directory contains application-level layout components that are used across the entire app but are not generic UI components.

## Components

- `header.tsx` - Main application header with navigation and user menu
- `footer.tsx` - Application footer with links and information

## Guidelines

1. These components can have app-specific logic and dependencies
2. They can import from features and other parts of the app
3. They should be used in app layouts, not within features
4. Keep business logic minimal - delegate to features when possible