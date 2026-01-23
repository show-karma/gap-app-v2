## Getting Started with Karma GAP Frontend

### Prerequisites

- **Bun** >= 1.3.5 (this project uses Bun as the package manager and test runner)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run only unit tests
bun test __tests__/unit

# Run only integration tests
bun test __tests__/integration
```

### Building

```bash
bun run build
```

### Linting

```bash
# Check for lint errors
bun run lint

# Fix lint errors
bun run lint:fix
```

### E2E Testing (Cypress)

```bash
# Open Cypress UI
bun run cypress:open

# Run E2E tests in development mode
bun run e2e

# Run E2E tests headlessly
bun run e2e:headless
```

### Other Commands

```bash
# Run Storybook
bun run storybook

# Build Storybook
bun run build-storybook

# Run Lighthouse CI
bun run lighthouse
```
