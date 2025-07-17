# Lib Directory

This directory contains generic utility functions, helpers, and tools that are used across the application but don't belong to any specific feature.

## Structure

```
lib/
├── format/         # Formatting utilities (date, currency, addresses)
├── utils/          # General utilities (cn, error handling, fetch)
├── analytics/      # Analytics integrations (Mixpanel, Amplitude)
└── monitoring/     # Monitoring tools (Sentry)
```

## Guidelines

1. Only truly generic, reusable code should be placed here
2. Feature-specific utilities belong in the feature's `lib/` directory
3. All exports should be properly typed with TypeScript
4. Utilities should be pure functions when possible
5. Include unit tests for all utilities